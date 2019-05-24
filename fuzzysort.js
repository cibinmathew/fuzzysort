/*
WHAT: SublimeText-like Fuzzy Search

USAGE:
  fuzzysort.single('fs', 'Fuzzy Search') // {score: -16}
  fuzzysort.single('test', 'test') // {score: 0}
  fuzzysort.single('doesnt exist', 'target') // null

  fuzzysort.go('mr', ['Monitor.cpp', 'MeshRenderer.cpp'])
  // [{score: -18, target: "MeshRenderer.cpp"}, {score: -6009, target: "Monitor.cpp"}]

  fuzzysort.highlight(fuzzysort.single('fs', 'Fuzzy Search'), '<b>', '</b>')
  // <b>F</b>uzzy <b>S</b>earch
*/

// UMD (Universal Module Definition) for fuzzysort
;(function(root, UMD) {
  if(typeof define === 'function' && define.amd) define([], UMD)
  else if(typeof module === 'object' && module.exports) module.exports = UMD()
  else root.fuzzysort = UMD()
})(this, function UMD() { function fuzzysortNew(instanceOptions) {

  var fuzzysort = {

    single: function(search, target, options) {
      if(!search) return null
      if(!isObj(search)) search = fuzzysort.getPreparedSearch(search)

      if(!target) return null
      if(!isObj(target)) target = fuzzysort.getPrepared(target)

      var allowTypo = options && options.allowTypo!==undefined ? options.allowTypo
        : instanceOptions && instanceOptions.allowTypo!==undefined ? instanceOptions.allowTypo
        : true
      var algorithm = allowTypo ? fuzzysort.algorithm : fuzzysort.algorithmNoTypo
      return algorithm(search, target, search[0])
      // var threshold = options && options.threshold || instanceOptions && instanceOptions.threshold || -9007199254740991
      // var result = algorithm(search, target, search[0])
      // if(result === null) return null
      // if(result.score < threshold) return null
      // return result
    },

    go: function(search, targets, options) {
      if(!search) return noResults;
      search = fuzzysort.prepareSearch(search);
      var searchLowerCode = search[0];
      var typosNumber = options && options.typosNumber || instanceOptions && instanceOptions.typosNumber || 1;
      var threshold = options && options.threshold || instanceOptions && instanceOptions.threshold || -9007199254740991;
      var limit = options && options.limit || instanceOptions && instanceOptions.limit || 9007199254740991;
      var allowTypo = options && options.allowTypo!==undefined ? options.allowTypo
        : instanceOptions && instanceOptions.allowTypo!==undefined ? instanceOptions.allowTypo : true;
      var applyErrorThresholdAfter = options && options.applyErrorThresholdAfter!==undefined ? options.applyErrorThresholdAfter
          : instanceOptions && instanceOptions.applyErrorThresholdAfter!==undefined ? instanceOptions.applyErrorThresholdAfter : null;
      var errorThreshold = options && options.errorThreshold!==undefined ? options.errorThreshold
          : instanceOptions && instanceOptions.errorThreshold!==undefined ? instanceOptions.errorThreshold : null;
      var keyOption = options && options.key !==undefined ? options.key : instanceOptions && instanceOptions.key;
      var keysOption = options && options.keys !==undefined ? options.keys : instanceOptions && instanceOptions.keys;
      var resultsLen = 0;
      var limitedCount = 0;
      var targetsLen = targets.length;
      var algorithm = allowTypo ? fuzzysort.algorithm : fuzzysort.algorithmNoTypo;
      var errorThresholdAfter = applyErrorThresholdAfter && applyErrorThresholdAfter < limit ? applyErrorThresholdAfter : 0;

      // This code is copy/pasted 3 times for performance reasons [options.keys, options.key, no keys]

      // options.keys
      if(keysOption) {
        var scoreFn = options.scoreFn || defaultScoreFn
        var keys = keysOption
        var keysLen = keys.length

        if (errorThreshold) {
          for(var i = targetsLen - 1; i >= 0; --i) { var obj = targets[i]
            var objResults = new Array(keysLen)
            for (var keyI = keysLen - 1; keyI >= 0; --keyI) {
              var key = keys[keyI]
              var target = getValue(obj, key)
              if(!target) { objResults[keyI] = null; continue }
              if(!isObj(target)) target = fuzzysort.getPrepared(target)

              /* Skip target string if it supposes to be very small related to search query (for performance reasons) */
              if (search.length - target._targetLowerCodes.length >= target._targetLowerCodes.length * 2) {
                objResults[keyI] = null;
                continue;
              }

              objResults[keyI] = algorithm(search, target, searchLowerCode, typosNumber)
            }
            objResults.obj = obj; // before scoreFn so scoreFn can use it
            var score = scoreFn(objResults);

            if(score === null
                || score < threshold
                || (resultsLen >= errorThresholdAfter
                    && score <= (q.peek().score + errorThreshold))) {
              continue;
            }

            objResults.score = score;
            if(resultsLen < limit) { q.add(objResults); ++resultsLen }
            else {
              ++limitedCount;
              if(score > q.peek().score) q.replaceTop(objResults)
            }
          }
        } else {
          /* options.keys search without errorThreshold option */
          for(var i = targetsLen - 1; i >= 0; --i) { var obj = targets[i]
            var objResults = new Array(keysLen)
            for (var keyI = keysLen - 1; keyI >= 0; --keyI) {
              var key = keys[keyI]
              var target = getValue(obj, key)
              if(!target) { objResults[keyI] = null; continue }
              if(!isObj(target)) target = fuzzysort.getPrepared(target)

              /* Skip target string if it supposes to be very small related to search query (for performance reasons) */
              if (search.length - target._targetLowerCodes.length >= target._targetLowerCodes.length * 2) {
                objResults[keyI] = null;
                continue;
              }

              objResults[keyI] = algorithm(search, target, searchLowerCode, typosNumber)
            }
            objResults.obj = obj // before scoreFn so scoreFn can use it
            var score = scoreFn(objResults)
            if(score === null) continue
            if(score < threshold) continue
            objResults.score = score
            if(resultsLen < limit) { q.add(objResults); ++resultsLen }
            else {
              ++limitedCount
              if(score > q.peek().score) q.replaceTop(objResults)
            }
          }
        }

      // options.key
      } else if(keyOption) {
       if (errorThreshold) {
         for(var i = targetsLen - 1; i >= 0; --i) {
           var obj = targets[i];
           var target = getValue(obj, keyOption);
           if(!target) continue;
           if(!isObj(target)) target = fuzzysort.getPrepared(target);

           /* Skip target string if it supposes to be very small related to search query (for performance reasons) */
           if (search.length - target._targetLowerCodes.length >= target._targetLowerCodes.length * 2) {
             continue;
           }

           var result = algorithm(search, target, searchLowerCode, typosNumber);

           if(result === null
               || result.score < threshold
               || (resultsLen >= errorThresholdAfter
                   && result.score <= (q.peek().score + errorThreshold))) {
             continue;
           }

           if(result.score < threshold) continue;

           // have to clone result so duplicate targets from different obj can each reference the correct obj
           result = {target:result.target, _targetLowerCodes:null, _nextBeginningIndexes:null, score:result.score, indexes:result.indexes, obj:obj} // hidden

           if(resultsLen < limit) { q.add(result); ++resultsLen }
           else {
             ++limitedCount
             if(result.score > q.peek().score) q.replaceTop(result)
           }
         }
       } else {
         /* options.key search without errorThreshold option */
         for(var i = targetsLen - 1; i >= 0; --i) {
           var obj = targets[i];
           var target = getValue(obj, keyOption);
           if(!target) continue;
           if(!isObj(target)) target = fuzzysort.getPrepared(target);

           /* Skip target string if it supposes to be very small related to search query (for performance reasons) */
           if (search.length - target._targetLowerCodes.length >= target._targetLowerCodes.length * 2) {
             continue;
           }

           var result = algorithm(search, target, searchLowerCode, typosNumber);
           if(result === null) continue;
           if(result.score < threshold) continue;

           // have to clone result so duplicate targets from different obj can each reference the correct obj
           result = {target:result.target, _targetLowerCodes:null, _nextBeginningIndexes:null, score:result.score, indexes:result.indexes, obj:obj} // hidden

           if(resultsLen < limit) { q.add(result); ++resultsLen }
           else {
             ++limitedCount
             if(result.score > q.peek().score) q.replaceTop(result)
           }
         }
       }

      // no keys
      } else {
        if (errorThreshold) {
          for (var i = targetsLen - 1; i >= 0; --i) {
            var target = targets[i];

            if(!target) {
              continue;
            }

            if(!isObj(target)) target = fuzzysort.getPrepared(target);

            /* Skip target string if it supposes to be very small related to search query (for performance reasons) */
            if (search.length - target._targetLowerCodes.length >= target._targetLowerCodes.length * 2) {
              continue;
            }

            var result = algorithm(search, target, searchLowerCode, typosNumber);

            if(result === null
                || result.score < threshold
                || (resultsLen > errorThresholdAfter
                    && result.score < (q.peek().score + errorThreshold))) {
              continue;
            }

            if(resultsLen < limit) {
              q.add(result);
              ++resultsLen;
            } else {
              ++limitedCount;

              if(result.score > q.peek().score) {
                q.replaceTop(result)
              }
            }
          }
        } else {
          /* no keys search without errorThreshold option */
          for (var i = targetsLen - 1; i >= 0; --i) {
            var target = targets[i];

            if(!target) {
              continue;
            }

            if(!isObj(target)) target = fuzzysort.getPrepared(target);

            /* Skip target string if it supposes to be very small related to search query (for performance reasons) */
            if (search.length - target._targetLowerCodes.length >= target._targetLowerCodes.length * 2) {
              continue;
            }

            var result = algorithm(search, target, searchLowerCode, typosNumber);

            if(result === null) {
              continue;
            }

            if(result.score < threshold) {
              continue;
            }

            if(resultsLen < limit) {
              q.add(result);
              ++resultsLen;
            } else {
              ++limitedCount;

              if(result.score > q.peek().score) {
                q.replaceTop(result)
              }
            }
          }
        }
      }

      if(resultsLen === 0) {
        return noResults;
      }

      var results = new Array(resultsLen);

      for (var i = resultsLen - 1; i >= 0; --i) {
        results[i] = q.poll();
      }

      results.total = resultsLen + limitedCount;

      return results;
    },

    goAsync: function(search, targets, options) {
      var canceled = false
      var p = new Promise(function(resolve, reject) {
        if(!search) return resolve(noResults)
        search = fuzzysort.prepareSearch(search)
        var searchLowerCode = search[0]

        var q = fastpriorityqueue()
        var iCurrent = targets.length - 1
        var threshold = options && options.threshold || instanceOptions && instanceOptions.threshold || -9007199254740991
        var limit = options && options.limit || instanceOptions && instanceOptions.limit || 9007199254740991
        var allowTypo = options && options.allowTypo!==undefined ? options.allowTypo
          : instanceOptions && instanceOptions.allowTypo!==undefined ? instanceOptions.allowTypo
          : true
        var algorithm = allowTypo ? fuzzysort.algorithm : fuzzysort.algorithmNoTypo
        var resultsLen = 0; var limitedCount = 0
        function step() {
          if(canceled) return reject('canceled')

          var startMs = Date.now()

          // This code is copy/pasted 3 times for performance reasons [options.keys, options.key, no keys]

          // options.keys
          if(options && options.keys) {
            var scoreFn = options.scoreFn || defaultScoreFn
            var keys = options.keys
            var keysLen = keys.length
            for(; iCurrent >= 0; --iCurrent) { var obj = targets[iCurrent]
              var objResults = new Array(keysLen)
              for (var keyI = keysLen - 1; keyI >= 0; --keyI) {
                var key = keys[keyI]
                var target = getValue(obj, key)
                if(!target) { objResults[keyI] = null; continue }
                if(!isObj(target)) target = fuzzysort.getPrepared(target)

                objResults[keyI] = algorithm(search, target, searchLowerCode)
              }
              objResults.obj = obj // before scoreFn so scoreFn can use it
              var score = scoreFn(objResults)
              if(score === null) continue
              if(score < threshold) continue
              objResults.score = score
              if(resultsLen < limit) { q.add(objResults); ++resultsLen }
              else {
                ++limitedCount
                if(score > q.peek().score) q.replaceTop(objResults)
              }

              if(iCurrent%1000/*itemsPerCheck*/ === 0) {
                if(Date.now() - startMs >= 10/*asyncInterval*/) {
                  isNode?setImmediate(step):setTimeout(step)
                  return
                }
              }
            }

          // options.key
          } else if(options && options.key) {
            var key = options.key
            for(; iCurrent >= 0; --iCurrent) { var obj = targets[iCurrent]
              var target = getValue(obj, key)
              if(!target) continue
              if(!isObj(target)) target = fuzzysort.getPrepared(target)

              var result = algorithm(search, target, searchLowerCode)
              if(result === null) continue
              if(result.score < threshold) continue

              // have to clone result so duplicate targets from different obj can each reference the correct obj
              result = {target:result.target, _targetLowerCodes:null, _nextBeginningIndexes:null, score:result.score, indexes:result.indexes, obj:obj} // hidden

              if(resultsLen < limit) { q.add(result); ++resultsLen }
              else {
                ++limitedCount
                if(result.score > q.peek().score) q.replaceTop(result)
              }

              if(iCurrent%1000/*itemsPerCheck*/ === 0) {
                if(Date.now() - startMs >= 10/*asyncInterval*/) {
                  isNode?setImmediate(step):setTimeout(step)
                  return
                }
              }
            }

          // no keys
          } else {
            for(; iCurrent >= 0; --iCurrent) { var target = targets[iCurrent]
              if(!target) continue
              if(!isObj(target)) target = fuzzysort.getPrepared(target)

              var result = algorithm(search, target, searchLowerCode)
              if(result === null) continue
              if(result.score < threshold) continue
              if(resultsLen < limit) { q.add(result); ++resultsLen }
              else {
                ++limitedCount
                if(result.score > q.peek().score) q.replaceTop(result)
              }

              if(iCurrent%1000/*itemsPerCheck*/ === 0) {
                if(Date.now() - startMs >= 10/*asyncInterval*/) {
                  isNode?setImmediate(step):setTimeout(step)
                  return
                }
              }
            }
          }

          if(resultsLen === 0) return resolve(noResults)
          var results = new Array(resultsLen)
          for(var i = resultsLen - 1; i >= 0; --i) results[i] = q.poll()
          results.total = resultsLen + limitedCount
          resolve(results)
        }

        isNode?setImmediate(step):step()
      })
      p.cancel = function() { canceled = true }
      return p
    },

    highlight: function(result, hOpen, hClose) {
      if(result === null) return null
      if(hOpen === undefined) hOpen = '<b>'
      if(hClose === undefined) hClose = '</b>'
      var highlighted = ''
      var matchesIndex = 0
      var opened = false
      var target = result.target
      var targetLen = target.length
      var matchesBest = result.indexes
      for(var i = 0; i < targetLen; ++i) { var char = target[i]
        if(matchesBest[matchesIndex] === i) {
          ++matchesIndex
          if(!opened) { opened = true
            highlighted += hOpen
          }

          if(matchesIndex === matchesBest.length) {
            highlighted += char + hClose + target.substr(i+1)
            break
          }
        } else {
          if(opened) { opened = false
            highlighted += hClose
          }
        }
        highlighted += char
      }

      return highlighted
    },

    prepare: function(target) {
      if(!target) return
      return {target:target, _targetLowerCodes:fuzzysort.prepareLowerCodes(target), _nextBeginningIndexes:null, score:null, indexes:null, obj:null} // hidden
    },
    prepareSlow: function(target) {
      if(!target) return
      return {target:target, _targetLowerCodes:fuzzysort.prepareLowerCodes(target), _nextBeginningIndexes:fuzzysort.prepareNextBeginningIndexes(target), score:null, indexes:null, obj:null} // hidden
    },
    prepareSearch: function(search) {
      if(!search) return
      return fuzzysort.prepareLowerCodes(search)
    },



    // Below this point is only internal code
    // Below this point is only internal code
    // Below this point is only internal code
    // Below this point is only internal code



    getPrepared: function(target) {
      if(target.length > 999) return fuzzysort.prepare(target) // don't cache huge targets
      var targetPrepared = preparedCache.get(target)
      if(targetPrepared !== undefined) return targetPrepared
      targetPrepared = fuzzysort.prepare(target)
      preparedCache.set(target, targetPrepared)
      return targetPrepared
    },
    getPreparedSearch: function(search) {
      if(search.length > 999) return fuzzysort.prepareSearch(search) // don't cache huge searches
      var searchPrepared = preparedSearchCache.get(search)
      if(searchPrepared !== undefined) return searchPrepared
      searchPrepared = fuzzysort.prepareSearch(search)
      preparedSearchCache.set(search, searchPrepared)
      return searchPrepared
    },

    algorithm: function(searchLowerCodes, prepared, searchLowerCode, typosNum) {
      var targetLowerCodes = prepared._targetLowerCodes;
      var searchLen = searchLowerCodes.length;
      var targetLen = targetLowerCodes.length;
      var isTypoExists = false;
      var searchI = 0; // where we at
      var targetI = 0; // where you at
      var matchesSimpleLen = 0;
      var score = 0;
      var lastMatchI = 0;
      /*
       * Special score coefficient
       * (10% match -> score *= 1000)
       */
      var scoreMatchCoeffs = {
        90: 2,
        80: 5,
        70: 10,
        60: 50,
        50: 100,
        40: 250,
        30: 500,
        20: 750,
        10: 1000
      };

      /*  get clean array for each call */
      matchesSimple = [];

      /* Search algorithm that reacts on excess letters */
      for(;;) {
        var targetLowerCode = targetLowerCodes[targetI];

        if(searchLowerCode === targetLowerCode) {
          matchesSimple[matchesSimpleLen++] = targetI;
          ++searchI;

          if(searchI === searchLen) {
            break;
          }

          searchLowerCode = searchLowerCodes[searchI];
        } else {
          if (searchLowerCode === spaceCharCode) {
            ++searchI;
            --targetI;
          } else {
            lastMatchI = searchI;

            isTypoExists = true;

            excessTyposLabel: for (var excessTyposNumber = 0; excessTyposNumber < typosNum; excessTyposNumber++) {
              /* Inner check on missing letters */
              for (var missingCharsNumber = 1; missingCharsNumber <= typosNum; missingCharsNumber++) {
                if (searchLowerCode === targetLowerCodes[targetI + missingCharsNumber]) {
                  ++lastMatchI;
                  searchI = lastMatchI;
                  matchesSimple[matchesSimpleLen++] = targetI + missingCharsNumber;
                  targetI = targetI + missingCharsNumber;

                  break excessTyposLabel;
                }
              }

              ++lastMatchI;

              if(lastMatchI === searchLen) {
                break;
              }

              searchLowerCode = searchLowerCodes[lastMatchI];

              if (searchLowerCode === spaceCharCode) {
                ++lastMatchI;
                searchI = lastMatchI;

                continue;
              }

              if (searchLowerCode === targetLowerCodes[targetI]) {
                ++lastMatchI;
                searchI = lastMatchI;
                matchesSimple[matchesSimpleLen++] = targetI;

                break;
              }
            }
          }

          /* Check if first match is not the first letter of the target */
          if (matchesSimpleLen === 1
              && matchesSimple[0] !== 0) {
            return null;
          }

          /* Returns result with the highest score when all matches completely fit target string */
          if (matchesSimpleLen === targetLen) {
            score -= searchLen - matchesSimpleLen;

            /*typoPenalty*/
            if(isTypoExists) {
              score += -20;
            }

            if (!prepared._nextBeginningIndexes) {
              prepared._nextBeginningIndexes = fuzzysort.prepareNextBeginningIndexes(prepared.target);
            }

            prepared.score = score;
            prepared.indexes = new Array(matchesSimpleLen);

            for(var i = matchesSimpleLen - 1; i >= 0; --i) {
              prepared.indexes[i] = matchesSimple[i];
            }

            return prepared;
          }

          if(searchI === searchLen
              || targetI === targetLen) {
            break;
          }

          searchLowerCode = searchLowerCodes[searchI];
        }

        ++targetI;

        if (targetI >= targetLen) {
          break;
        }
      }

      if (matchesSimpleLen === 0) {
        return null;
      }

      /* tally up the score & keep track of matches for highlighting later */
      var lastTargetI = -1;
      /* The value of matches percent (how many chars have been found from target string as percent value) */
      var matchesPercent = Math.round((matchesSimpleLen / targetLen * 100) / 10) * 10;

      if (matchesPercent === 0) {
        return null;
      }

      // console.log('matchesSimple: ', matchesSimple);
      // console.log('matchesPercent: ', matchesPercent);
      // console.log('targetLen: ', targetLen);

      if (matchesPercent < 50) {
        for(var i = 0; i < matchesSimpleLen; ++i) {
          var targetI = matchesSimple[i];

          /* score only goes down if they're not consecutive */
          if(lastTargetI !== targetI - 1) {
            score -= targetI;
          }

          lastTargetI = targetI;
        }
      }

      score -= searchLen - matchesSimpleLen;

      if (matchesPercent && scoreMatchCoeffs[matchesPercent]) {
        score *= scoreMatchCoeffs[matchesPercent];
      }

      /*typoPenalty*/
      if(isTypoExists) {
        score += -20;
      }

      score -= targetLen - matchesSimpleLen;
      prepared.score = score;
      prepared.indexes = new Array(matchesSimpleLen);

      for(var i = matchesSimpleLen - 1; i >= 0; --i) {
        prepared.indexes[i] = matchesSimple[i];
      }

      return prepared;
    },

    algorithmNoTypo: function(searchLowerCodes, prepared, searchLowerCode) {
      var targetLowerCodes = prepared._targetLowerCodes
      var searchLen = searchLowerCodes.length
      var targetLen = targetLowerCodes.length
      var searchI = 0 // where we at
      var targetI = 0 // where you at
      var matchesSimpleLen = 0

      // very basic fuzzy match; to remove non-matching targets ASAP!
      // walk through target. find sequential matches.
      // if all chars aren't found then exit
      for(;;) {
        var isMatch = searchLowerCode === targetLowerCodes[targetI]
        if(isMatch) {
          matchesSimple[matchesSimpleLen++] = targetI
          ++searchI; if(searchI === searchLen) break
          searchLowerCode = searchLowerCodes[searchI]
        }
        ++targetI; if(targetI >= targetLen) return null // Failed to find searchI
      }

      var searchI = 0
      var successStrict = false
      var matchesStrictLen = 0

      var nextBeginningIndexes = prepared._nextBeginningIndexes
      if(nextBeginningIndexes === null) nextBeginningIndexes = prepared._nextBeginningIndexes = fuzzysort.prepareNextBeginningIndexes(prepared.target)
      var firstPossibleI = targetI = matchesSimple[0]===0 ? 0 : nextBeginningIndexes[matchesSimple[0]-1]

      // Our target string successfully matched all characters in sequence!
      // Let's try a more advanced and strict test to improve the score
      // only count it as a match if it's consecutive or a beginning character!
      if(targetI !== targetLen) for(;;) {
        if(targetI >= targetLen) {
          // We failed to find a good spot for this search char, go back to the previous search char and force it forward
          if(searchI <= 0) break // We failed to push chars forward for a better match

          --searchI
          var lastMatch = matchesStrict[--matchesStrictLen]
          targetI = nextBeginningIndexes[lastMatch]

        } else {
          var isMatch = searchLowerCodes[searchI] === targetLowerCodes[targetI]
          if(isMatch) {
            matchesStrict[matchesStrictLen++] = targetI
            ++searchI; if(searchI === searchLen) { successStrict = true; break }
            ++targetI
          } else {
            targetI = nextBeginningIndexes[targetI]
          }
        }
      }

      { // tally up the score & keep track of matches for highlighting later
        if(successStrict) { var matchesBest = matchesStrict; var matchesBestLen = matchesStrictLen }
        else { var matchesBest = matchesSimple; var matchesBestLen = matchesSimpleLen }
        var score = 0
        var lastTargetI = -1
        for(var i = 0; i < searchLen; ++i) { var targetI = matchesBest[i]
          // score only goes down if they're not consecutive
          if(lastTargetI !== targetI - 1) score -= targetI
          lastTargetI = targetI
        }
        if(!successStrict) score *= 1000
        score -= targetLen - searchLen
        prepared.score = score
        prepared.indexes = new Array(matchesBestLen); for(var i = matchesBestLen - 1; i >= 0; --i) prepared.indexes[i] = matchesBest[i]

        return prepared
      }
    },

    prepareLowerCodes: function(str) {
      var strLen = str.length
      var lowerCodes = [] // new Array(strLen)    sparse array is too slow
      var lower = str.toLowerCase()
      for(var i = 0; i < strLen; ++i) lowerCodes[i] = lower.charCodeAt(i)
      return lowerCodes
    },
    prepareBeginningIndexes: function(target) {
      var targetLen = target.length
      var beginningIndexes = []; var beginningIndexesLen = 0
      var wasUpper = false
      var wasAlphanum = false
      for(var i = 0; i < targetLen; ++i) {
        var targetCode = target.charCodeAt(i)
        var isUpper = targetCode>=65&&targetCode<=90
        var isAlphanum = isUpper || targetCode>=97&&targetCode<=122 || targetCode>=48&&targetCode<=57
        var isBeginning = isUpper && !wasUpper || !wasAlphanum || !isAlphanum
        wasUpper = isUpper
        wasAlphanum = isAlphanum
        if(isBeginning) beginningIndexes[beginningIndexesLen++] = i
      }
      return beginningIndexes
    },
    prepareNextBeginningIndexes: function(target) {
      var targetLen = target.length
      var beginningIndexes = fuzzysort.prepareBeginningIndexes(target)
      var nextBeginningIndexes = [] // new Array(targetLen)     sparse array is too slow
      var lastIsBeginning = beginningIndexes[0]
      var lastIsBeginningI = 0
      for(var i = 0; i < targetLen; ++i) {
        if(lastIsBeginning > i) {
          nextBeginningIndexes[i] = lastIsBeginning
        } else {
          lastIsBeginning = beginningIndexes[++lastIsBeginningI]
          nextBeginningIndexes[i] = lastIsBeginning===undefined ? targetLen : lastIsBeginning
        }
      }
      return nextBeginningIndexes
    },

    cleanup: cleanup,
    new: fuzzysortNew,
  }
  return fuzzysort
} // fuzzysortNew

// This stuff is outside fuzzysortNew, because it's shared with instances of fuzzysort.new()
var isNode = typeof require !== 'undefined' && typeof window === 'undefined'
// var MAX_INT = Number.MAX_SAFE_INTEGER
// var MIN_INT = Number.MIN_VALUE
var preparedCache = new Map()
var preparedSearchCache = new Map()
var noResults = []; noResults.total = 0
var matchesSimple = []; var matchesStrict = []
  var spaceCharCode = 32
function cleanup() { preparedCache.clear(); preparedSearchCache.clear(); matchesSimple = []; matchesStrict = [] }
function defaultScoreFn(a) {
  var max = -9007199254740991
  for (var i = a.length - 1; i >= 0; --i) {
    var result = a[i]; if(result === null) continue
    var score = result.score
    if(score > max) max = score
  }
  if(max === -9007199254740991) return null
  return max
}

// prop = 'key'              2.5ms optimized for this case, seems to be about as fast as direct obj[prop]
// prop = 'key1.key2'        10ms
// prop = ['key1', 'key2']   27ms
function getValue(obj, prop) {
  var tmp = obj[prop]; if(tmp !== undefined) return tmp
  var segs = prop
  if(!Array.isArray(prop)) segs = prop.split('.')
  var len = segs.length
  var i = -1
  while (obj && (++i < len)) obj = obj[segs[i]]
  return obj
}

function isObj(x) { return typeof x === 'object' } // faster as a function

// Hacked version of https://github.com/lemire/FastPriorityQueue.js
var fastpriorityqueue=function(){var r=[],o=0,e={};function n(){for(var e=0,n=r[e],c=1;c<o;){var f=c+1;e=c,f<o&&r[f].score<r[c].score&&(e=f),r[e-1>>1]=r[e],c=1+(e<<1)}for(var a=e-1>>1;e>0&&n.score<r[a].score;a=(e=a)-1>>1)r[e]=r[a];r[e]=n}return e.add=function(e){var n=o;r[o++]=e;for(var c=n-1>>1;n>0&&e.score<r[c].score;c=(n=c)-1>>1)r[n]=r[c];r[n]=e},e.poll=function(){if(0!==o){var e=r[0];return r[0]=r[--o],n(),e}},e.peek=function(e){if(0!==o)return r[0]},e.replaceTop=function(o){r[0]=o,n()},e};
var q = fastpriorityqueue() // reuse this, except for async, it needs to make its own

return fuzzysortNew()
}) // UMD

// TODO: (performance) wasm version!?

// TODO: (performance) layout memory in an optimal way to go fast by avoiding cache misses

// TODO: (performance) preparedCache is a memory leak

// TODO: (like sublime) backslash === forwardslash

// TODO: (performance) i have no idea how well optizmied the allowing typos algorithm is
