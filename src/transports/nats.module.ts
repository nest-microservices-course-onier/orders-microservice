import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { NATS_SERVICE, envs } from 'src/config';

@Module({
    imports: [
        ClientsModule.register([
            {
                // name: PRODUCT_SERVICE, // with TCP transportation
                name: NATS_SERVICE, // using NATS
                // transport: Transport.TCP,
                transport: Transport.NATS,
                options: {
        
                    // NOT more NECESSARY when using NATS 
                    // host: envs.productMicroserviceHost,
                    // port: envs.productMicroservicePort,
        
                    servers: envs.natsServers,
              },
            },
        ]),
    ],
    exports: [
        ClientsModule.register([
            {
                // name: PRODUCT_SERVICE, // with TCP transportation
                name: NATS_SERVICE, // using NATS
                // transport: Transport.TCP,
                transport: Transport.NATS,
                options: {
        
                    // NOT more NECESSARY when using NATS 
                    // host: envs.productMicroserviceHost,
                    // port: envs.productMicroservicePort,
        
                    servers: envs.natsServers,
              },
            },
        ]),
    ],
})
export class NatsModule {}
