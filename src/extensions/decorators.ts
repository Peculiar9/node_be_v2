import 'reflect-metadata';

export function Column(type: string) {
    return function (target: any, propertyKey: string): void {
        const columns = Reflect.getMetadata('columns', target.constructor) || [];
        columns.push({ name: propertyKey, type });
        Reflect.defineMetadata('columns', columns, target.constructor);
    };
}

export function getEntityMetadata(entity: Function): { columns: string[], constraints: string[] } {
  const columns = Reflect.getMetadata('columns', entity) || [];
  const foreignKeys = Reflect.getMetadata('foreignKeys', entity) || [];

  // Process columns
  const columnDefinitions = columns.map((col: { name: string; type: string }) => {
      return `"${col.name}" ${col.type}`;
  });

  // Process foreign key constraints
  const constraintDefinitions = foreignKeys.map((fk: {
      column: string;
      references: {
          table: string;
          field: string;
          onDelete: string;
          onUpdate: string;
          constraint: string;
      }
  }) => {
      return `CONSTRAINT ${fk.references.constraint} FOREIGN KEY ("${fk.column}") ` +
          `REFERENCES "${fk.references.table}" ("${fk.references.field}") ` +
          `ON DELETE ${fk.references.onDelete} ` +
          `ON UPDATE ${fk.references.onUpdate}`;
  });

  return {
      columns: columnDefinitions,
      constraints: constraintDefinitions
  };
}

export function getIndexMetadata(entity: Function, tableName: string): string[] {
  // Fetch metadata stored by the decorators
  const indexes = Reflect.getMetadata('indexes', entity) || [];
  const compositeIndexes = Reflect.getMetadata('compositeIndexes', entity) || [];

  const indexStatements: string[] = [];

  // Handle single-column indexes (from @Index)
  indexes.forEach((index: { column: string; unique: boolean; type: string }) => {
    const unique = index.unique ? 'UNIQUE ' : '';
    const using = index.type ? `USING ${index.type} ` : '';
    const statement = `CREATE ${unique}INDEX IF NOT EXISTS idx_${tableName}_${index.column} ON "${tableName}" ${using}("${index.column}");`;
    indexStatements.push(statement);
  });

  // Handle multi-column indexes (from @CompositeIndex)
  compositeIndexes.forEach((columns: string[]) => {
    const columnList = columns.map(col => `"${col}"`).join(', ');
    const statement = `CREATE INDEX IF NOT EXISTS idx_${tableName}_${columns.join('_')} ON "${tableName}" (${columnList});`;
    indexStatements.push(statement);
  });

  return indexStatements;
}

export interface ForeignKeyOptions {
    table: string;
    field: string;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
    constraint?: string;
}

export function ForeignKey(options: ForeignKeyOptions) {
  return function (target: any, propertyKey: string) {
      const foreignKeys = Reflect.getMetadata('foreignKeys', target.constructor) || [];
      foreignKeys.push({
          column: propertyKey,
          references: {
              table: options.table,
              field: options.field,
              onDelete: options.onDelete || 'CASCADE',
              onUpdate: options.onUpdate || 'CASCADE',
              constraint: options.constraint || `fk_${options.table}_${propertyKey}`
          }
      });
      Reflect.defineMetadata('foreignKeys', foreignKeys, target.constructor);
  };
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