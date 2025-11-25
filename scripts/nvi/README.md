This directory contains a script, `updateNVI.js`, to compute NVI values for a list or lists of hic urls.  The 
script searchs for urls without corresponding "nvi" values in `src/nvi.js` and makes a Straw call to retrieve the missing values.
The output is a string of key-value pairs.  This string should be copy/pasted to `src/nvi.js`.