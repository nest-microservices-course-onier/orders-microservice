import { OrderStatus } from "@prisma/client";
import { IsEnum, IsUUID } from "class-validator";


export class ChangeOrderStatusDto {

    @IsUUID(4) // version of uuid
    id: string;

    @IsEnum(OrderStatus, {
        message: 'Invalid order status',
    })
    status: OrderStatus;

}
