/**
 * Shared SQL filter clauses for excluding grammatical description entries.
 *
 * These are appended to WHERE clauses across database.js and
 * distractorGenerator.js to keep vocabulary queries clean.
 */

/**
 * SQL fragment (starts with AND) that filters out grammatical entries
 * from word queries. The calling query must alias the words table
 * appropriately or use bare column names.
 *
 * @param {string} prefix - Table alias prefix, e.g. 'w.' or '' (default: '')
 */
export const grammaticalFilter = (prefix = '') => `
  AND ${prefix}word NOT LIKE '[%'
  AND ${prefix}translation NOT LIKE '[%'
  AND ${prefix}translation NOT LIKE '%nominative%'
  AND ${prefix}translation NOT LIKE '%accusative%'
  AND ${prefix}translation NOT LIKE '%dative%'
  AND ${prefix}translation NOT LIKE '%genitive%'
  AND ${prefix}translation NOT LIKE '%inflection of%'
  AND ${prefix}translation NOT LIKE '%conjugation of%'
  AND ${prefix}translation NOT LIKE '%declension of%'
  AND ${prefix}translation NOT LIKE '%form of%'
  AND ${prefix}translation NOT LIKE '%singular of%'
  AND ${prefix}translation NOT LIKE '%plural of%'
  AND ${prefix}translation NOT LIKE '%masculine%'
  AND ${prefix}translation NOT LIKE '%feminine%'
  AND ${prefix}translation NOT LIKE '%neuter%'
  AND ${prefix}translation NOT LIKE '%past tense%'
  AND ${prefix}translation NOT LIKE '%present tense%'
  AND ${prefix}translation NOT LIKE '%comparative of%'
  AND ${prefix}translation NOT LIKE '%superlative of%'
  AND ${prefix}word NOT LIKE '%nominative%'
  AND ${prefix}word NOT LIKE '%accusative%'
  AND ${prefix}word NOT LIKE '%dative%'
  AND ${prefix}word NOT LIKE '%genitive%'
  AND LENGTH(${prefix}translation) < 100
`;

/**
 * Pre-built version with no table prefix, for queries using bare column names.
 */
export const GRAMMATICAL_FILTER = grammaticalFilter('');

/**
 * Pre-built version with 'w.' table prefix, for queries that alias words as w.
 */
export const GRAMMATICAL_FILTER_W = grammaticalFilter('w.');
