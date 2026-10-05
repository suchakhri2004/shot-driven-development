/** Thrown by validation. `code` is a stable machine-readable identifier the client can translate. */
export class GameError extends Error {
  constructor(public readonly code: string, message?: string) {
    super(message ?? code)
  }
}
