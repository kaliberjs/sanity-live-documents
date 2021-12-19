import * as rxjs from 'rxjs'
import sanityClient from 'part:@sanity/base/client'
import { share, scan, mergeMap, map } from 'rxjs/operators'

const client = sanityClient.withConfig({ apiVersion: '2021-11-06' })

/** @returns {rxjs.Observable<any>} */
export function liveDocuments({ filter }) {
  const query = `*[${filter}]`

  const documents$ = client.observable.fetch(query)
  const documentUpdates$ = client.observable.listen(query)

  return rxjs
    .concat(
      documents$,
      documents$.pipe(mergeMap(patchDocuments(documentUpdates$)))
    )
    .pipe(share())
}

function patchDocuments(documentUpdates$) {
  return documents => {
    return documentUpdates$.pipe(
      scan(
        (result, update) => {
          const index = result.findIndex(x => x._id === update.documentId)
          const newValue = update.result
          return index < 0
            ? result.concat([newValue])
            : replaceAt(result, index, newValue)
        },
        documents
      )
    )
  }
}

function replaceAt(a, index, replacement) {
  return a.slice(0, index).concat([replacement].filter(Boolean), a.slice(index + 1))
}
