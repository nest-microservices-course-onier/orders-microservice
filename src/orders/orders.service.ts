import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { OrderStatus, PrismaClient } from '@prisma/client';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { PaginationDto } from '../common/dto/pagination.dto';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto } from './dto/change-order-status.dto';
import { NATS_SERVICE, PRODUCT_SERVICE } from 'src/config';
import { firstValueFrom } from 'rxjs';
import { OrderItemDto } from './dto/order-item.dto';
import { OrderWithProducts } from '../interfaces/order-with-products.interface';
import { PaidOrderDto } from './dto/paid-order.dto';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connected');
  }

  private readonly logger = new Logger('OrdersService');

  constructor(
    // @Inject(PRODUCT_SERVICE) private readonly productClient: ClientProxy,
    @Inject(NATS_SERVICE) private readonly client: ClientProxy,
  ) {
    super();
  }
  
  async create(createOrderDto: CreateOrderDto) {

    try {
      
      // 1- validate products IDS exist on database products
      const productIds = createOrderDto.items.map(item => item.productId);
  
      const products: any[] = await firstValueFrom(
        this.client.send({cmd: 'validate_products'}, productIds)
      );

      // 2- calculate total price for each product * quantity (total)
      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {

        const price = products.find(product => product.id === orderItem.productId).price;

        return acc + (price * orderItem.quantity);

      }, 0);

      // 3- calculate total items was bought
      const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
        return acc + orderItem.quantity;
      }, 0);

      // 4- create a transaction in database
      const order = await this.order.create({
        data: {
          totalAmount: totalAmount,
          totalItems: totalItems,
          OrderItem: {
            createMany: {
              data: createOrderDto.items.map(orderItem => ({
                quantity: orderItem.quantity,
                productId: orderItem.productId,
                price: products.find(product => product.id === orderItem.productId).price,
              })),
            },
          }
        },
        include: {
          OrderItem: {
            select: {
              quantity: true,
              price: true,
              productId: true,
            }
          }
        }
      });
  
      return {
        ...order,
        OrderItem: order.OrderItem.map((orderItem) => ({
          ...orderItem,
          name: products.find((product) => product.id === orderItem.productId)
            .name,
        })),
      };

    } catch (error) {
      throw new RpcException({
        message: 'Check logs',
        status: HttpStatus.BAD_REQUEST,
      });
    }
    
  }

  async findAll(OrderPaginationDto: OrderPaginationDto) {
    const { page, limit, status } = OrderPaginationDto;

    const total = await this.order.count({
      where: { status }, // if not status in query parameter then count all
    });
    const lastPage = Math.ceil(total / limit);

    return {
      data: await this.order.findMany({
        where: { status },
        take: limit,
        skip: (page - 1) * limit,
      }),
      metadata: {
        total,
        page,
        lastPage,
      },
    };
  }

  async findOne(id: string) {
    const order = await this.order.findFirst({
      where: { id },
      include: {
        OrderItem: {
          select: {
            productId: true,
            price: true,
            quantity: true,
          }
        }
      }
    });

    if (!order) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `Order with ID: ${id} not found`,
      });
    }

    const productIds = order.OrderItem.map(orderItem => orderItem.productId);

    const products: any[] = await firstValueFrom(
      this.client.send({cmd: 'validate_products'}, productIds)
    );

    return {
      ...order,
      OrderItem: order.OrderItem.map(orderItem => ({
        ...orderItem,
        name: products.find(product => product.id === orderItem.productId).name,
      })),
    };
  }

  async changeStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
    const { id, status } = changeOrderStatusDto;

    const order = await this.findOne(id);
    if (order.status === status) return order;

    return this.order.update({
      where: { id },
      data: { status },
    });
  }

  async createPaymemtSession(order: OrderWithProducts) {
    const paymentSession = await firstValueFrom(
      this.client.send('create.payment.session', {
        order: order.id,
        currency: 'usd',
        items: order.OrderItem.map(orderItem => ({
          name: orderItem.name,
          price: orderItem.price,
          quantity: orderItem.quantity,
        })),
      })
    );

    return paymentSession;
  }

  async markOrderAsPaid(paidOrderDto: PaidOrderDto) {
    const { orderId, stripePaymentId, receiptUrl } = paidOrderDto;

    const order = await this.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.PAID,
        paid: true,
        paidAt: new Date(),
        stripeChargeId: stripePaymentId,

        // relation
        OrderReceipt: {
          create: {
            receiptUrl: receiptUrl,
          }
        }
      }
    });

    return order;
  }
}
