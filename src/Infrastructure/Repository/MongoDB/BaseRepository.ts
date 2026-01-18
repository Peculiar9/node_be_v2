// import { IRepository } from '@Core/Application/Interface/Persistence/Repository/IRepository';

// export abstract class BaseRepository<T> implements IRepository<T> {
//     abstract searchKeyword(keyword: string): Promise<T[] | null | undefined>;
//     abstract getById(id: string): Promise<T | null | undefined>;
//     abstract getAll(): Promise<T[] | null | undefined>;
//     abstract create(data: Partial<T>): Promise<T>;
//     abstract update(id: string, data: Partial<T>): Promise<T | null | undefined>;
//     abstract isExist(predicate: Partial<T>): Promise<boolean>;
//     abstract getByPredicate(predicate: Partial<T>): Promise<T[] | null | undefined>;
//     abstract customQuery(query: object, projection?: object): Promise<any[]>;
//     abstract delete(id: string): Promise<boolean | null | undefined>;
// }