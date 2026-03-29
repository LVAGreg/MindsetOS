#!/usr/bin/env node
/**
 * Create Default Auto-Login User for ECOS
 */

const db = require('../services/db.cjs');

async function createDefaultUser() {
  try {
    console.log('🔧 Creating default ECOS user...');

    // Check if user already exists
    const existing = await db.getUserByEmail('guest@ecos.local');

    if (existing) {
      console.log('✅ Default user already exists:', existing.email);
      console.log('   User ID:', existing.id);
      return existing;
    }

    // Create default user
    const user = await db.createUser('guest@ecos.local', 'ECOS Guest User');

    console.log('✅ Default user created successfully!');
    console.log('   Email:', user.email);
    console.log('   ID:', user.id);
    console.log('   Name:', user.first_name, user.last_name);

    return user;
  } catch (error) {
    console.error('❌ Failed to create default user:', error.message);
    throw error;
  } finally {
    // Close database connection
    await db.pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  createDefaultUser().catch(console.error);
}

module.exports = { createDefaultUser };
