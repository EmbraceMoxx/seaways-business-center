import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as config from 'config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        const dbConfig = config.get('database.mysql.seawaysBusinessCenter');
        return {
          type: 'mysql',
          host: dbConfig.host,
          port: +dbConfig.port,
          username: dbConfig.userName,
          password: dbConfig.password,
          database: dbConfig.dbName,
          entities: [`${__dirname}/../../**/**.entity{.ts,.js}`],
          synchronize: false,
          logging: false,
          poolSize: 20, // 定期监控应用的性能和数据库负载，适时调整
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class MysqlModule {}
