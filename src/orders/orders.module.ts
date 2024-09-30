import { Module } from '@nestjs/common';

import { NatsModule } from 'src/transports/nats.module';

import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  imports: [

    // OLD connection with Product Microservice using TCP
    // ClientsModule.register([
    //   {
    //     name: PRODUCT_SERVICE,
    //     transport: Transport.TCP,
    //     options: {
          // host: envs.productMicroserviceHost,
          // port: envs.productMicroservicePort,
    //     }
    //   }
    // ]),

    // now using NATS
    NatsModule,

  ],
})
export class OrdersModule {}
