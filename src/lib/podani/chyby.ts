const STATUSY = {
  'cizi-puvod': 403,
  'limit-pozadavku': 429,
  nedostupne: 503,
  'spatny-typ': 415,
  'prilis-velke': 413,
  'prazdna-nahravka': 400,
  'spatny-text': 422,
  'prepis-selhal': 502,
  'prazdny-prepis': 422,
} as const;

export type KodChyby = keyof typeof STATUSY;

export class ChybaPodani extends Error {
  readonly kod: KodChyby;
  readonly status: (typeof STATUSY)[KodChyby];

  constructor(kod: KodChyby) {
    super(`Podání odmítnuto (${kod}).`);
    this.kod = kod;
    this.status = STATUSY[kod];
  }
}
