declare module "better-sqlite3" {
  interface Statement {
    run(params?: unknown): unknown;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  }

  interface Database {
    exec(sql: string): this;
    pragma(statement: string): unknown;
    prepare(sql: string): Statement;
    transaction<TArgs extends unknown[], TReturn>(
      fn: (...args: TArgs) => TReturn
    ): (...args: TArgs) => TReturn;
  }

  interface DatabaseConstructor {
    new (filename: string): Database;
  }

  const Database: DatabaseConstructor;
  export default Database;
}
