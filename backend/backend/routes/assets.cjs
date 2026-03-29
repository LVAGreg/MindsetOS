/**
 * Assets Routes Module
 *
 * Handles all user asset management endpoints:
 * - List assets with filtering
 * - Create, read, update, delete assets
 * - File upload and download
 * - Export to markdown/JSON
 */

const fs = require('fs');
const pathModule = require('path');
const crypto = require('crypto');
const multiparty = require('multiparty');
const { getUserFromToken } = require('../middleware/auth.cjs');
const { pool } = require('../utils/database.cjs');

/**
 * Register all assets-related routes
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {string} method - HTTP method
 * @param {string} path - URL path
 * @param {Object} corsHeaders - CORS headers
 * @returns {boolean} - True if route was handled, false otherwise
 */
function registerAssetsRoutes(req, res, method, path, corsHeaders) {
  // GET /api/assets - List user's assets with optional filters
  if (path.startsWith('/api/assets') && method === 'GET' && !path.match(/^\/api\/assets\/[^\/]+/)) {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return true;
    }

    try {
      const url = new URL(`http://localhost${path}`);
      const assetType = url.searchParams.get('type'); // note, file, suggested_note
      const conversationId = url.searchParams.get('conversationId');
      const agentId = url.searchParams.get('agentId');
      const isPinned = url.searchParams.get('pinned') === 'true';
      const isArchived = url.searchParams.get('archived') === 'true';
      const searchQuery = url.searchParams.get('q');
      const tags = url.searchParams.getAll('tag');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      let query = `
        SELECT
          a.*,
          ag.name as agent_name,
          c.title as conversation_title
        FROM user_assets a
        LEFT JOIN agents ag ON a.agent_id = ag.id
        LEFT JOIN conversations c ON a.conversation_id = c.id
        WHERE a.user_id = $1
      `;
      const params = [user.id];
      let paramCount = 1;

      if (assetType) {
        paramCount++;
        query += ` AND a.asset_type = $${paramCount}`;
        params.push(assetType);
      }

      if (conversationId) {
        paramCount++;
        query += ` AND a.conversation_id = $${paramCount}`;
        params.push(conversationId);
      }

      if (agentId) {
        paramCount++;
        query += ` AND a.agent_id = $${paramCount}`;
        params.push(agentId);
      }

      if (isPinned) {
        query += ` AND a.is_pinned = true`;
      }

      if (!isArchived) {
        query += ` AND a.is_archived = false`;
      }

      if (searchQuery) {
        paramCount++;
        query += ` AND (
          to_tsvector('english', COALESCE(a.title, '') || ' ' || COALESCE(a.content, ''))
          @@ plainto_tsquery('english', $${paramCount})
        )`;
        params.push(searchQuery);
      }

      if (tags.length > 0) {
        paramCount++;
        query += ` AND a.tags && $${paramCount}::text[]`;
        params.push(tags);
      }

      query += ` ORDER BY a.is_pinned DESC, a.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      pool.query(query, params).then(result => {
        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({
          assets: result.rows,
          count: result.rows.length,
          limit,
          offset
        }));
      }).catch(error => {
        console.error('❌ [ASSETS] List error:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to fetch assets' }));
      });
    } catch (error) {
      console.error('❌ [ASSETS] List error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to fetch assets' }));
    }
    return true;
  }

  // POST /api/assets - Create new asset
  if (path === '/api/assets' && method === 'POST') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return true;
    }

    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const {
          assetType,
          title,
          content,
          filePath,
          fileName,
          fileSize,
          mimeType,
          conversationId,
          agentId,
          messageId,
          tags,
          isPinned,
          suggestionReason,
          suggestionConfidence
        } = JSON.parse(body);

        // Validate required fields
        if (!assetType || !['note', 'file', 'suggested_note', 'memory_snapshot'].includes(assetType)) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Invalid or missing asset_type' }));
          return;
        }

        const result = await pool.query(`
          INSERT INTO user_assets (
            user_id, asset_type, title, content, file_path, file_name,
            file_size, mime_type, conversation_id, agent_id, message_id,
            tags, is_pinned, suggestion_reason, suggestion_confidence
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING *
        `, [
          user.id,
          assetType,
          title || null,
          content || null,
          filePath || null,
          fileName || null,
          fileSize || null,
          mimeType || null,
          conversationId || null,
          agentId || null,
          messageId || null,
          tags || [],
          isPinned || false,
          suggestionReason || null,
          suggestionConfidence || null
        ]);

        console.log(`✅ [ASSETS] Created ${assetType} for user ${user.email}`);

        res.writeHead(201, corsHeaders);
        res.end(JSON.stringify({ asset: result.rows[0] }));
      } catch (error) {
        console.error('❌ [ASSETS] Create error:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to create asset' }));
      }
    });
    return true;
  }

  // GET /api/assets/:id - Get single asset
  if (path.match(/^\/api\/assets\/[^\/]+$/) && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return true;
    }

    const assetId = path.split('/')[3];

    pool.query(`
      SELECT
        a.*,
        ag.name as agent_name,
        c.title as conversation_title
      FROM user_assets a
      LEFT JOIN agents ag ON a.agent_id = ag.id
      LEFT JOIN conversations c ON a.conversation_id = c.id
      WHERE a.id = $1 AND a.user_id = $2
    `, [assetId, user.id]).then(result => {
      if (result.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'Asset not found' }));
        return;
      }

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ asset: result.rows[0] }));
    }).catch(error => {
      console.error('❌ [ASSETS] Get error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to fetch asset' }));
    });
    return true;
  }

  // PATCH /api/assets/:id - Update asset
  if (path.match(/^\/api\/assets\/[^\/]+$/) && method === 'PATCH') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return true;
    }

    const assetId = path.split('/')[3];

    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const updates = JSON.parse(body);
        const allowedFields = ['title', 'content', 'tags', 'is_pinned', 'is_archived'];
        const setClauses = [];
        const params = [assetId, user.id];
        let paramCount = 2;

        for (const [key, value] of Object.entries(updates)) {
          if (allowedFields.includes(key)) {
            paramCount++;
            setClauses.push(`${key} = $${paramCount}`);
            params.push(value);
          }
        }

        if (setClauses.length === 0) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'No valid fields to update' }));
          return;
        }

        const result = await pool.query(`
          UPDATE user_assets
          SET ${setClauses.join(', ')}
          WHERE id = $1 AND user_id = $2
          RETURNING *
        `, params);

        if (result.rows.length === 0) {
          res.writeHead(404, corsHeaders);
          res.end(JSON.stringify({ error: 'Asset not found' }));
          return;
        }

        console.log(`✅ [ASSETS] Updated asset ${assetId} for user ${user.email}`);

        res.writeHead(200, corsHeaders);
        res.end(JSON.stringify({ asset: result.rows[0] }));
      } catch (error) {
        console.error('❌ [ASSETS] Update error:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to update asset' }));
      }
    });
    return true;
  }

  // DELETE /api/assets/:id - Delete asset
  if (path.match(/^\/api\/assets\/[^\/]+$/) && method === 'DELETE') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return true;
    }

    const assetId = path.split('/')[3];

    pool.query(`
      DELETE FROM user_assets
      WHERE id = $1 AND user_id = $2
      RETURNING id, asset_type, file_path
    `, [assetId, user.id]).then(result => {
      if (result.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'Asset not found' }));
        return;
      }

      // Delete physical file if it exists
      const deletedAsset = result.rows[0];
      if (deletedAsset.file_path && fs.existsSync(deletedAsset.file_path)) {
        try {
          fs.unlinkSync(deletedAsset.file_path);
          console.log(`✅ [ASSETS] Deleted file from storage: ${deletedAsset.file_path}`);
        } catch (fileErr) {
          console.error(`⚠️ [ASSETS] Failed to delete file: ${deletedAsset.file_path}`, fileErr);
        }
      }

      console.log(`✅ [ASSETS] Deleted ${deletedAsset.asset_type} ${assetId} for user ${user.email}`);

      res.writeHead(200, corsHeaders);
      res.end(JSON.stringify({ success: true, id: assetId }));
    }).catch(error => {
      console.error('❌ [ASSETS] Delete error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to delete asset' }));
    });
    return true;
  }

  // POST /api/assets/export - Export assets to Markdown or JSON
  if (path === '/api/assets/export' && method === 'POST') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return true;
    }

    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { format, assetIds } = JSON.parse(body);

        if (!['markdown', 'json'].includes(format)) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'Invalid format. Must be markdown or json' }));
          return;
        }

        // Fetch assets
        const result = await pool.query(`
          SELECT *
          FROM user_assets
          WHERE user_id = $1 AND id = ANY($2::uuid[])
          ORDER BY created_at DESC
        `, [user.id, assetIds || []]);

        if (format === 'json') {
          res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json', 'Content-Disposition': 'attachment; filename="assets-export.json"' });
          res.end(JSON.stringify(result.rows, null, 2));
        } else {
          // Markdown format
          let markdown = `# My Assets Export\n\nExported on: ${new Date().toLocaleString()}\n\n`;

          for (const asset of result.rows) {
            markdown += `## ${asset.title || 'Untitled'}\n\n`;
            markdown += `**Type:** ${asset.asset_type}\n`;
            markdown += `**Created:** ${new Date(asset.created_at).toLocaleString()}\n`;
            if (asset.tags && asset.tags.length > 0) {
              markdown += `**Tags:** ${asset.tags.join(', ')}\n`;
            }
            markdown += `\n${asset.content || ''}\n\n---\n\n`;
          }

          res.writeHead(200, { ...corsHeaders, 'Content-Type': 'text/markdown', 'Content-Disposition': 'attachment; filename="assets-export.md"' });
          res.end(markdown);
        }

        console.log(`✅ [ASSETS] Exported ${result.rows.length} assets as ${format} for user ${user.email}`);
      } catch (error) {
        console.error('❌ [ASSETS] Export error:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to export assets' }));
      }
    });
    return true;
  }

  // POST /api/assets/upload - Upload file and create asset
  if (path === '/api/assets/upload' && method === 'POST') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return true;
    }

    // Need to determine __dirname equivalent for module context
    const uploadDir = pathModule.join(process.cwd(), 'uploads', 'user-assets');

    const form = new multiparty.Form({
      maxFilesSize: 10 * 1024 * 1024, // 10MB max
      uploadDir: uploadDir
    });

    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('❌ [ASSETS] Upload parse error:', err);
        res.writeHead(400, corsHeaders);
        res.end(JSON.stringify({ error: 'File upload failed' }));
        return;
      }

      try {
        const file = files.file?.[0];
        if (!file) {
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'No file provided' }));
          return;
        }

        // Validate file type (allow documents, images, text)
        const allowedMimeTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'text/markdown',
          'image/png',
          'image/jpeg',
          'image/gif',
          'image/webp',
          'application/json'
        ];

        if (!allowedMimeTypes.includes(file.headers['content-type'])) {
          fs.unlinkSync(file.path); // Delete uploaded file
          res.writeHead(400, corsHeaders);
          res.end(JSON.stringify({ error: 'File type not allowed' }));
          return;
        }

        // Generate secure filename
        const fileExt = pathModule.extname(file.originalFilename);
        const safeFileName = `${user.id}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}${fileExt}`;
        const finalPath = pathModule.join(uploadDir, safeFileName);

        // Move file to final location
        fs.renameSync(file.path, finalPath);

        // Get file stats
        const stats = fs.statSync(finalPath);

        // Extract metadata from fields
        const title = fields.title?.[0] || file.originalFilename;
        const conversationId = fields.conversationId?.[0] || null;
        const agentId = fields.agentId?.[0] || null;
        const tags = fields.tags ? JSON.parse(fields.tags[0]) : [];

        // Create asset record
        const result = await pool.query(`
          INSERT INTO user_assets (
            user_id, asset_type, title, file_path, file_name,
            file_size, mime_type, conversation_id, agent_id, tags
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `, [
          user.id,
          'file',
          title,
          finalPath,
          file.originalFilename,
          stats.size,
          file.headers['content-type'],
          conversationId,
          agentId,
          tags
        ]);

        console.log(`✅ [ASSETS] Uploaded file ${file.originalFilename} (${stats.size} bytes) for user ${user.email}`);

        res.writeHead(201, corsHeaders);
        res.end(JSON.stringify({ asset: result.rows[0] }));
      } catch (error) {
        console.error('❌ [ASSETS] Upload error:', error);
        res.writeHead(500, corsHeaders);
        res.end(JSON.stringify({ error: 'Failed to save uploaded file' }));
      }
    });
    return true;
  }

  // GET /api/assets/:id/download - Download file asset
  if (path.match(/^\/api\/assets\/[^\/]+\/download$/) && method === 'GET') {
    const user = getUserFromToken(req.headers.authorization);
    if (!user) {
      res.writeHead(401, corsHeaders);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return true;
    }

    const assetId = path.split('/')[3];

    pool.query(`
      SELECT * FROM user_assets
      WHERE id = $1 AND user_id = $2 AND asset_type = 'file'
    `, [assetId, user.id]).then(result => {
      if (result.rows.length === 0) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'File not found' }));
        return;
      }

      const asset = result.rows[0];

      if (!fs.existsSync(asset.file_path)) {
        res.writeHead(404, corsHeaders);
        res.end(JSON.stringify({ error: 'File no longer exists on disk' }));
        return;
      }

      // Stream file to response
      res.writeHead(200, {
        ...corsHeaders,
        'Content-Type': asset.mime_type,
        'Content-Disposition': `attachment; filename="${asset.file_name}"`,
        'Content-Length': asset.file_size
      });

      const fileStream = fs.createReadStream(asset.file_path);
      fileStream.pipe(res);
      fileStream.on('error', (err) => {
        console.error('❌ [ASSETS] File stream error:', err);
        res.end();
      });

      console.log(`✅ [ASSETS] Downloaded file ${asset.file_name} for user ${user.email}`);
    }).catch(error => {
      console.error('❌ [ASSETS] Download error:', error);
      res.writeHead(500, corsHeaders);
      res.end(JSON.stringify({ error: 'Failed to download file' }));
    });
    return true;
  }

  // Route not handled by this module
  return false;
}

module.exports = { registerAssetsRoutes };
