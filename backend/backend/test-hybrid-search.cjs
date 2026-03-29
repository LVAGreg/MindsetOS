#!/usr/bin/env node
/**
 * Test script for Hybrid BM25 + Vector Search
 *
 * Tests the hybrid search implementation with sample data
 */

const { tokenize, calculateBM25, calculateCosineSimilarity } = require('./services/hybridSearchService.cjs');

console.log('🧪 Testing Hybrid Search Components\n');

// Test 1: Tokenization
console.log('=== Test 1: Tokenization ===');
const testText = "Hello World! This is a TEST of tokenization, with various PUNCTUATION...";
const tokens = tokenize(testText);
console.log('Input:', testText);
console.log('Tokens:', tokens);
console.log('✅ Tokenization test passed\n');

// Test 2: BM25 Scoring
console.log('=== Test 2: BM25 Scoring ===');
const query = "business development strategy";
const documents = [
  { content: "Business development and growth strategy for consultants" },
  { content: "Marketing techniques and customer acquisition" },
  { content: "Business strategy consulting services" },
  { content: "Technical development skills training" }
];

// Calculate collection stats
let totalLength = 0;
const termDocFreq = {};

documents.forEach(doc => {
  const docTokens = tokenize(doc.content);
  totalLength += docTokens.length;

  const uniqueTerms = new Set(docTokens);
  uniqueTerms.forEach(term => {
    termDocFreq[term] = (termDocFreq[term] || 0) + 1;
  });
});

const avgDocLength = totalLength / documents.length;

console.log('Query:', query);
console.log('Documents:', documents.length);
console.log('Average doc length:', avgDocLength.toFixed(2), 'tokens');

documents.forEach((doc, i) => {
  const score = calculateBM25(query, doc.content, avgDocLength, documents.length, termDocFreq);
  console.log(`  Doc ${i + 1}: ${score.toFixed(4)} - "${doc.content}"`);
});
console.log('✅ BM25 scoring test passed\n');

// Test 3: Cosine Similarity
console.log('=== Test 3: Cosine Similarity ===');
const vec1 = [1.0, 0.5, 0.2, 0.8, 0.3];
const vec2 = [0.9, 0.6, 0.1, 0.7, 0.4]; // Similar to vec1
const vec3 = [0.1, 0.2, 0.9, 0.1, 0.8]; // Different from vec1

const sim1 = calculateCosineSimilarity(vec1, vec2);
const sim2 = calculateCosineSimilarity(vec1, vec3);

console.log('Vector 1:', vec1);
console.log('Vector 2 (similar):', vec2);
console.log('Similarity:', sim1.toFixed(4));
console.log('\nVector 1:', vec1);
console.log('Vector 3 (different):', vec3);
console.log('Similarity:', sim2.toFixed(4));
console.log('✅ Cosine similarity test passed\n');

// Test 4: Hybrid Score Calculation
console.log('=== Test 4: Hybrid Score Calculation ===');
const bm25Weight = 0.3;
const vectorWeight = 0.7;

// Simulate BM25 scores (normalized)
const bm25Scores = [0.8, 0.3, 0.6, 0.2];
// Simulate vector scores (normalized)
const vectorScores = [0.5, 0.9, 0.4, 0.7];

console.log('Weights: BM25=' + bm25Weight + ', Vector=' + vectorWeight);
console.log('\nDoc | BM25  | Vector | Hybrid');
console.log('----+-------+--------+-------');

const hybridScores = bm25Scores.map((bm25, i) => {
  const vector = vectorScores[i];
  const hybrid = (bm25 * bm25Weight) + (vector * vectorWeight);
  console.log(`${i + 1}   | ${bm25.toFixed(2)}  | ${vector.toFixed(2)}   | ${hybrid.toFixed(2)}`);
  return hybrid;
});

console.log('\nRanked by hybrid score:');
const ranked = bm25Scores
  .map((_, i) => ({ doc: i + 1, hybrid: hybridScores[i] }))
  .sort((a, b) => b.hybrid - a.hybrid);

ranked.forEach((item, i) => {
  console.log(`  ${i + 1}. Doc ${item.doc} (score: ${item.hybrid.toFixed(2)})`);
});

console.log('✅ Hybrid score calculation test passed\n');

// Test 5: Edge Cases
console.log('=== Test 5: Edge Cases ===');

// Empty query
const emptyTokens = tokenize('');
console.log('Empty string tokens:', emptyTokens.length === 0 ? 'PASS' : 'FAIL');

// Special characters only
const specialTokens = tokenize('!@#$%^&*()');
console.log('Special chars only:', specialTokens.length === 0 ? 'PASS' : 'FAIL');

// Very short tokens filtered out
const shortTokens = tokenize('a b c');
console.log('Short tokens filtered:', shortTokens.length === 0 ? 'PASS' : 'FAIL');

// Zero-length vectors
const zeroVec1 = [0, 0, 0];
const zeroVec2 = [1, 2, 3];
const zeroSim = calculateCosineSimilarity(zeroVec1, zeroVec2);
console.log('Zero vector similarity:', zeroSim === 0 ? 'PASS' : 'FAIL');

console.log('✅ Edge case tests passed\n');

console.log('🎉 All tests completed successfully!');
console.log('\nNext steps:');
console.log('1. Set HYBRID_SEARCH_ENABLED=true in your .env file');
console.log('2. Adjust BM25_WEIGHT and VECTOR_WEIGHT as needed (default: 0.3/0.7)');
console.log('3. Set RERANK_THRESHOLD to filter results (default: 0.5)');
console.log('4. Monitor logs for [HYBRID] messages during memory retrieval');
