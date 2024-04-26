// import { DataSourceOptions, DataSource } from 'typeorm';
// import { User } from './user/entities/user.entity';

//***********For sequelize***********
// export const Config: DataSourceOptions = {
//     type: 'mysql',
//     host: 'localhost',
//     port: 3306,
//     username: 'root',
//     password: '',
//     database: 'nestdb',
//     entities: [User],
//     synchronize: true,
//     migrationsTableName: 'migration_table',
//     migrations: ['dist/user/migration/*.js'],
//   };
//   const dataSource = new DataSource(Config);
//   export default dataSource;

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRoot('mongodb://localhost:27017/authdb', {
      //   useUnifiedTopology: true,
      // Other options...
    }),
    // Other modules...
  ],
  controllers: [],
  providers: [],
})
export class Config { }