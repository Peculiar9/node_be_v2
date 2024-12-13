import 'reflect-metadata';

export function Column(type: string) {
    return function (target: any, propertyKey: string): void {
        const columns = Reflect.getMetadata('columns', target.constructor) || [];
        columns.push({ name: propertyKey, type });
        Reflect.defineMetadata('columns', columns, target.constructor);
    };
}

export function getEntityMetadata(entity: Function): Record<string, string> {
    const columns = Reflect.getMetadata('columns', entity) || [];
    return columns.reduce((acc: Record<string, string>, col: { name: string; type: string }) => {
        acc[col.name] = col.type;
        return acc;
    }, {});
}

export function Index(options?: { 
    unique?: boolean, 
    type?: 'BTREE' | 'HASH' | 'GIST' 
  }) {
    return function (target: any, propertyKey: string) {
      const indexes = Reflect.getMetadata('indexes', target.constructor) || [];
      indexes.push({ 
        column: propertyKey, 
        unique: options?.unique || false,
        type: options?.type || 'BTREE'
      });
      Reflect.defineMetadata('indexes', indexes, target.constructor);
    };
  }

  export function CompositeIndex(columns: string[]) {
    return function (target: Function) {
      const compositeIndexes = Reflect.getMetadata('compositeIndexes', target) || [];
      compositeIndexes.push(columns);
      Reflect.defineMetadata('compositeIndexes', compositeIndexes, target);
    };
  }