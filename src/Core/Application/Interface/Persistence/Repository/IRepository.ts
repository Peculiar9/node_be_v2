export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  findByCondition(condition: Partial<T>): Promise<T[]>;
  create(entity: T): Promise<T>;
  update(id: string, entity: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  executeRawQuery(query: string, params: any[]): Promise<any>;
  count(condition?: Partial<T>): Promise<number>;
  bulkCreate(entities: T[]): Promise<T[]>;
  bulkUpdate(entities: Partial<T>[]): Promise<T[]>;
  bulkDelete(ids: string[]): Promise<number>;
}