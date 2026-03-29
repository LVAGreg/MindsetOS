/**
 * Documents Routes Module
 *
 * Handles document management:
 * - POST /api/documents/upload - Upload and process document
 * - GET /api/documents - List user documents (with optional agentId filter)
 * - DELETE /api/documents/:id - Delete document (soft delete with file cleanup)
 */

const fs = require('fs');
const pathModule = require('path');
const url = require('url');
const multiparty = require('multiparty');
const { getUserFromToken } = require('../middleware/auth.cjs');
const { pool } = require('../config/database.cjs');

/**
 * Register document routes
 * @param {Object} req - HTTP request object
 * @param {Object} res - HTTP response object
 * @param {string} method - HTTP method
 * @param {string} path - Request path
 * @param {Object} corsHeaders - CORS headers
 * @returns {boolean} - True if route was handled, false otherwise
 */
async function registerDocumentRoutes(req, res, method, path, corsHeaders) {
  // POST /api/documents/upload - Upload and process document
  if (path === '/api/documents/upload' && method === 'POST') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return true;
    }

    const form = new multiparty.Form({
      uploadDir: pathModule.join(__dirname, '../../uploads'),
      maxFilesSize: 10 * 1024 * 1024 // 10MB limit
    });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('❌ File upload error:', err);
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'File upload failed' }));
        return;
      }

      try {
        const file = files.file?.[0];
        const agentId = fields.agentId?.[0];

        if (!file) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'No file uploaded' }));
          return;
        }

        // Validate file type
        const allowedTypes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'text/markdown'
        ];

        if (!allowedTypes.includes(file.headers['content-type'])) {
          fs.unlinkSync(file.path); // Clean up
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Invalid file type. Only PDF, DOCX, TXT, and MD files are allowed.' }));
          return;
        }

        // Insert document record (matching actual database schema)
        const docResult = await pool.query(`
          INSERT INTO documents (
            user_id, project_id, filename, original_filename,
            file_path, file_size, mime_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id
        `, [
          user.id,
          null, // project_id
          pathModule.basename(file.path),
          file.originalFilename,
          file.path,
          file.size,
          file.headers['content-type']
        ]);

        const documentId = docResult.rows[0].id;

        console.log(`📄 Document uploaded: ${file.originalFilename} (ID: ${documentId})`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          success: true,
          id: documentId,
          message: 'Document uploaded successfully'
        }));
      } catch (error) {
        console.error('❌ Document upload error:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to process document' }));
      }
    });
    return true;
  }

  // GET /api/documents - List user documents
  if (path === '/api/documents' && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return true;
    }

    try {
      const parsedUrl = url.parse(req.url, true);
      const agentId = parsedUrl.query.agentId;

      let query = `
        SELECT
          d.id,
          d.agent_id,
          d.original_filename,
          d.file_type,
          d.file_size,
          d.processing_status,
          d.chunk_count,
          d.embedding_count,
          d.total_tokens,
          d.error_message,
          d.created_at,
          a.name as agent_name
        FROM documents d
        LEFT JOIN agents a ON d.agent_id = a.id
        WHERE d.user_id = $1 AND d.deleted_at IS NULL
      `;

      const params = [user.id];

      if (agentId) {
        query += ' AND d.agent_id = $2';
        params.push(agentId);
      }

      query += ' ORDER BY d.created_at DESC';

      const result = await pool.query(query, params);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ documents: result.rows }));
    } catch (error) {
      console.error('❌ Error fetching documents:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to fetch documents' }));
    }
    return true;
  }

  // DELETE /api/documents/:id - Delete document
  if (path.startsWith('/api/documents/') && method === 'DELETE') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return true;
    }

    try {
      const documentId = path.split('/').pop();

      // Verify ownership
      const docCheck = await pool.query(
        'SELECT id, file_url FROM documents WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
        [documentId, user.id]
      );

      if (docCheck.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'Document not found' }));
        return true;
      }

      // Soft delete document
      await pool.query(
        'UPDATE documents SET deleted_at = NOW() WHERE id = $1',
        [documentId]
      );

      // Clean up physical file
      const fileUrl = docCheck.rows[0].file_url;
      if (fileUrl && fs.existsSync(fileUrl)) {
        fs.unlinkSync(fileUrl);
      }

      console.log(`🗑️ Deleted document ${documentId} for user ${user.email}`);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, message: 'Document deleted' }));
    } catch (error) {
      console.error('❌ Error deleting document:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to delete document' }));
    }
    return true;
  }

  // Route not handled by this module
  return false;
}

module.exports = { registerDocumentRoutes };
