const db = require('./db.cjs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Parse multipart/form-data for file uploads
 */
function parseMultipart(req, boundary) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        const parts = [];
        const boundaryBuffer = Buffer.from(`--${boundary}`);

        let start = 0;
        while (true) {
          const boundaryIndex = buffer.indexOf(boundaryBuffer, start);
          if (boundaryIndex === -1) break;

          const headerEnd = buffer.indexOf('\r\n\r\n', boundaryIndex);
          if (headerEnd === -1) break;

          const headers = buffer.slice(boundaryIndex + boundaryBuffer.length + 2, headerEnd).toString();
          const nextBoundary = buffer.indexOf(boundaryBuffer, headerEnd);
          const content = buffer.slice(headerEnd + 4, nextBoundary === -1 ? buffer.length : nextBoundary - 2);

          const nameMatch = headers.match(/name="([^"]+)"/);
          const filenameMatch = headers.match(/filename="([^"]+)"/);
          const contentTypeMatch = headers.match(/Content-Type: (.+)/);

          if (nameMatch) {
            parts.push({
              name: nameMatch[1],
              filename: filenameMatch ? filenameMatch[1] : null,
              contentType: contentTypeMatch ? contentTypeMatch[1].trim() : null,
              content: content
            });
          }

          start = headerEnd + 4 + content.length;
          if (nextBoundary === -1) break;
        }

        resolve(parts);
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

/**
 * Extract text content from file based on mime type
 */
function extractTextContent(filePath, mimeType) {
  try {
    if (mimeType && (mimeType.startsWith('text/') || mimeType === 'application/json')) {
      return fs.readFileSync(filePath, 'utf-8');
    }
    // For now, only support text files
    // TODO: Add PDF, DOCX extraction
    return null;
  } catch (error) {
    console.error('Text extraction error:', error);
    return null;
  }
}

// ====================
// PROJECT ENDPOINTS
// ====================

/**
 * GET /api/projects - Get all user projects
 */
async function getProjects(userId) {
  const result = await db.pool.query(
    'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  return result.rows;
}

/**
 * POST /api/projects - Create new project
 */
async function createProject(userId, { name, description, color }) {
  const result = await db.pool.query(
    `INSERT INTO projects (user_id, name, description, color)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, name, description || null, color || '#3B82F6']
  );
  return result.rows[0];
}

/**
 * PUT /api/projects/:id - Update project
 */
async function updateProject(projectId, userId, { name, description, color }) {
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(name);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(description);
  }
  if (color !== undefined) {
    updates.push(`color = $${paramIndex++}`);
    values.push(color);
  }

  updates.push(`updated_at = NOW()`);
  values.push(projectId, userId);

  const result = await db.pool.query(
    `UPDATE projects SET ${updates.join(', ')}
     WHERE id = $${paramIndex++} AND user_id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0];
}

/**
 * DELETE /api/projects/:id - Delete project (cascades to folders, conversations, memories)
 */
async function deleteProject(projectId, userId) {
  const result = await db.pool.query(
    'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING *',
    [projectId, userId]
  );
  return result.rows[0];
}

// ====================
// FOLDER ENDPOINTS
// ====================

/**
 * GET /api/projects/:projectId/folders - Get project folders
 */
async function getFolders(projectId) {
  const result = await db.pool.query(
    'SELECT * FROM folders WHERE project_id = $1 ORDER BY created_at ASC',
    [projectId]
  );
  return result.rows;
}

/**
 * POST /api/projects/:projectId/folders - Create folder
 */
async function createFolder(projectId, { name, parent_folder_id }) {
  const result = await db.pool.query(
    `INSERT INTO folders (project_id, name, parent_folder_id)
     VALUES ($1, $2, $3) RETURNING *`,
    [projectId, name, parent_folder_id || null]
  );
  return result.rows[0];
}

/**
 * PUT /api/folders/:id - Update folder
 */
async function updateFolder(folderId, { name, parent_folder_id }) {
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(name);
  }
  if (parent_folder_id !== undefined) {
    updates.push(`parent_folder_id = $${paramIndex++}`);
    values.push(parent_folder_id);
  }

  values.push(folderId);

  const result = await db.pool.query(
    `UPDATE folders SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  return result.rows[0];
}

/**
 * DELETE /api/folders/:id - Delete folder
 */
async function deleteFolder(folderId) {
  const result = await db.pool.query(
    'DELETE FROM folders WHERE id = $1 RETURNING *',
    [folderId]
  );
  return result.rows[0];
}

// ====================
// DOCUMENT/FILE UPLOAD ENDPOINTS
// ====================

/**
 * POST /api/documents/upload - Upload file
 */
async function uploadDocument(req, userId, projectId) {
  const contentType = req.headers['content-type'] || '';
  const boundaryMatch = contentType.match(/boundary=(.+)/);

  if (!boundaryMatch) {
    throw new Error('No boundary found in multipart request');
  }

  const boundary = boundaryMatch[1];
  const parts = await parseMultipart(req, boundary);

  const filePart = parts.find(p => p.filename);
  if (!filePart) {
    throw new Error('No file found in upload');
  }

  // Generate unique filename
  const fileExt = path.extname(filePart.filename);
  const uniqueFilename = `${Date.now()}_${crypto.randomBytes(8).toString('hex')}${fileExt}`;
  const filePath = path.join(UPLOAD_DIR, uniqueFilename);

  // Save file
  fs.writeFileSync(filePath, filePart.content);

  // Extract text content
  const contentText = extractTextContent(filePath, filePart.contentType);

  // Save to database
  const result = await db.pool.query(
    `INSERT INTO documents
     (user_id, project_id, filename, original_filename, file_path, file_size, mime_type, content_text)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      userId,
      projectId || null,
      uniqueFilename,
      filePart.filename,
      filePath,
      filePart.content.length,
      filePart.contentType,
      contentText
    ]
  );

  return result.rows[0];
}

/**
 * GET /api/documents - Get user documents
 */
async function getDocuments(userId, projectId) {
  let query = 'SELECT id, user_id, project_id, original_filename, file_size, mime_type, uploaded_at FROM documents WHERE user_id = $1';
  const params = [userId];

  if (projectId) {
    query += ' AND project_id = $2';
    params.push(projectId);
  }

  query += ' ORDER BY uploaded_at DESC';

  const result = await db.pool.query(query, params);
  return result.rows;
}

/**
 * GET /api/documents/:id - Get document details
 */
async function getDocument(documentId, userId) {
  const result = await db.pool.query(
    'SELECT * FROM documents WHERE id = $1 AND user_id = $2',
    [documentId, userId]
  );
  return result.rows[0];
}

/**
 * GET /api/documents/:id/download - Download document
 */
async function downloadDocument(documentId, userId) {
  const doc = await getDocument(documentId, userId);
  if (!doc) return null;

  const fileContent = fs.readFileSync(doc.file_path);
  return {
    content: fileContent,
    filename: doc.original_filename,
    mimeType: doc.mime_type
  };
}

/**
 * DELETE /api/documents/:id - Delete document
 */
async function deleteDocument(documentId, userId) {
  const doc = await getDocument(documentId, userId);
  if (!doc) return null;

  // Delete file from disk
  if (fs.existsSync(doc.file_path)) {
    fs.unlinkSync(doc.file_path);
  }

  // Delete from database
  await db.pool.query('DELETE FROM documents WHERE id = $1', [documentId]);
  return doc;
}

module.exports = {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  uploadDocument,
  getDocuments,
  getDocument,
  downloadDocument,
  deleteDocument
};
