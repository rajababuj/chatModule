import {WebSocketGateway,OnGatewayConnection,WebSocketServer,SubscribeMessage,MessageBody} from '@nestjs/websockets';
  import { Socket, Server } from 'socket.io';
  import { MessageStatus } from '../utils/enum';
  import { v4 as uuidv4 } from 'uuid';
  import { catchError, throwError } from 'rxjs';
  import { Injectable, Inject, HttpException, HttpStatus, Controller } from '@nestjs/common';
  import { ClientProxy, MessagePattern } from '@nestjs/microservices';
//   import mongoose from 'mongoose';
  import { SupportController } from "./support.controller";
  @Injectable()
  @Controller("something")
  @WebSocketGateway()
  export class SocketGateway implements OnGatewayConnection {
  
    @WebSocketServer() server: Server;
  
    private readonly connectedClients: Map<string, Socket> = new Map();
    private readonly connectedUsers: Map<string, string> = new Map();
  
    constructor(
      @Inject('SUPPORT_MICROSERVICE') private readonly supportClient: ClientProxy,
      @Inject('COMMON_MICROSERVICE') private readonly commonServiceClient: ClientProxy,
      @Inject('ADMIN_MICROSERVICE') private readonly adminClient: ClientProxy,
  
      
      ) { }
      
      handleConnection(client: Socket): void {
      const userId = client.handshake.query['user_id']?.toString() ?? '0';
      const clientId = client.id;
  
      console.log(`User ${userId} connected with ID: ${clientId}`);
  
      // Store the connected client
      this.connectedClients.set(clientId, client);
      this.connectedUsers.set(clientId, userId);
  
      console.log("Here", this.connectedUsers);
      
  
      client.on('disconnect', () => {
        this.connectedClients.delete(clientId);
        this.connectedUsers.delete(clientId);
        console.log(`User ${userId} disconnected`);
        console.log(this.connectedUsers);
      });
  
      let role = ''
      let role_ = {}
      client.on('update_data',async(data:any)=>{
        console.log("HERE",data);
        
        this.adminClient.send({ cmd: 'sub_admin_list' }, data)
        .subscribe({
          next: (result) => {   
          console.log("HERE INNNNNNNN",result);
  
            role_ = result.role_Data
            // console.log("this.connectedUsers.get(client.id)[userId]",this.connectedUsers.values());
            let output = result.adminData.map((data:any)=>{
              // console.log("admins",data);
              const userId = data._id;
              const roleId = data.role_id;
              // console.log("userId",userId);
              // console.log("-----------------------------------",("roleHasPermissionUpdateEvent-"+roleId))
              if (this.connectedUsers.get(client.id)?.length) {
                let data = {
                    role_, roleId
                }
                // console.log('role id',role_)
                  client.broadcast.emit("roleHasPermissionUpdateEvent-"+roleId,data);
                  
              }
            })                         
          },
          error: (error) => {
            console.log('Error sending message222222:', error);
          },
        });
      })
  
      
  
      
      client.on('support_message', async (data, ack) => {
        console.log(`Received message from User ${client.id}: ${this.connectedUsers.get(client.id)}`);
        let userId = this.connectedUsers.get(client.id)
        this.supportClient.send({ cmd: 'support_message' }, userId)
          .subscribe({
            next: (result) => {
              role = result?.role
            },
            error: (error) => {
              console.log('Error sending message:', error);
            },
          });
  
        let ticket_id = data.ticket
        let user_id = ''
        this.supportClient.send({ cmd: 'ticket_id' }, ticket_id)
          .subscribe({
            next: (result) => {
              // console.log("result", result);
  
              user_id = result
              console.log("USERIIIIDDDDd", user_id);
              if (role === 'user') { // 1-user, 2-admin
                let message = {
                  type: data.type ?? null,
                  message_type: data.message_type ?? null,
                  data: data.data ?? null,
                  ticket: data.ticket ?? null,
                  ticket_no: result.ticket_id ?? null,
                  from: this.connectedUsers.get(client.id)
                }
  
                console.log("message", message)
  
                client.broadcast.emit('admin_support', message);
                this.supportClient.send({ cmd: 'message1' }, message)
                  .subscribe({
                    next: (result) => {
                      console.log("result", result);
                    },
                    error: (error) => {
                      console.log('Error sending user message:', error);
                    },
                  });
                // ack(data)
              } else {
                let message_ = {
                  type: data.type ?? null,
                  message_type: data.message_type ?? null,
                  data: data.data ?? null,
                  ticket: data.ticket ?? null,
                  ticket_no: result.ticket_id ?? null,
                  from: this.connectedUsers.get(client.id)
                }
  
                client.broadcast.emit(user_id + '_support', data);
                this.supportClient.send({ cmd: 'message1' }, message_)
                  .subscribe({
                    next: (result) => {
                      console.log("result", result);
                    },
                    error: (error) => {
                      console.log('Error sending admin message:', error);
                    },
                  });
               
              }
            },
            error: (error) => {
              console.log('Error sending message:', error);
            },
          });
        //  return 0
  
  
      });
      client.on('maintenace_mode', async (data, ack) => {
        const isMaintenanceMode = data.isWebMaintenance; 
        
        client.broadcast.emit('maintenance_mode_status', isMaintenanceMode);
        if (isMaintenanceMode) {
            // console.log('Maintenance mode is ON');
        } else {
            // console.log('Maintenance mode is OFF');
        }    
        
      })
          
      //==================chat module=====================================
  
      //                send message user to user
      client.on('chat_message', async (data, ack) => {

        
        console.log(`Received chat_message from User ${client.id}: ${this.connectedUsers.get(client.id)}`);
        let userId = this.connectedUsers.get(client.id)
        
        let message = {
          data: data.data ?? null,
          to: data.to ?? null,
          from: this.connectedUsers.get(client.id),
          status: MessageStatus.SENT,
          mid: uuidv4()
        }
        
        const isUserIdPresent = Array.from(this.connectedUsers.values()).includes(data.to);
        
        if (isUserIdPresent) {
  
          let reciever_id = data.to
          
          if (reciever_id) {
            this.supportClient.send({ cmd: 'check_offline_data' }, reciever_id)
              .subscribe({
                next: (result) => {
                  console.log("result", result);
                },
                error: (error) => {
                  console.log('Error check_offline_data message:', error);
                },
              });
          }
  
  
          client.broadcast.emit(this.connectedUsers.get(client.id) + '_chat', data);
          this.supportClient.send({ cmd: 'chat' }, message)
            .subscribe({
              next: (result) => {
                console.log("result", result);
              },
              error: (error) => {
                console.log('Error chat_message message:', error);
              },
            });
        } else {
          this.supportClient.send({ cmd: 'offline_message' }, message)
            .subscribe({
              next: (result) => {
                console.log("result", result);
              },
              error: (error) => {
                console.log('Error offline_message message:', error);
              },
            });
          console.log("nahi mila");
  
        }
      });
  
  
      //              read message event
      client.on('message_status_read', async (data, ack) => {
        console.log(`Received chat_message from User ${client.id}: ${this.connectedUsers.get(client.id)}`);
        let userId = this.connectedUsers.get(client.id)
        
        let message = {
          _id: data.mid ?? null,
        }
  
        client.broadcast.emit('message_read', data);
        this.supportClient.send({ cmd: 'message_read' }, message)
          .subscribe({
            next: (result) => {
              console.log("result", result);
            },
            error: (error) => {
              console.log('Error message_read message:', error);
            },
          });
  
      });
  
      //              readall  message event
      client.on('message_status_readall', async (data, ack) => {
        console.log(`Received chat_message from User ${client.id}: ${this.connectedUsers.get(client.id)}`);
        let userId = this.connectedUsers.get(client.id)
  
        let message = {
          ticketId: data.ticketId ?? null,
          from: data.from ?? null,  
        }
  
        this.supportClient.send({ cmd: 'message_readall' }, message)
          .subscribe({
            next: (result) => {
              console.log("result", result);
              client.broadcast.emit('message_readall', data);
              
            },
            error: (error) => {
              console.log('Error message_read all message:', error);
            },
          });
  
      });
  
  
      //              delivered message event
      client.on('message_status_deliver', async (data, ack) => {
        console.log(`Received chat_message from User ${client.id}: ${this.connectedUsers.get(client.id)}`);
        let userId = this.connectedUsers.get(client.id)
  
        let message = {
          mid: data.mid ?? null,
        }
  
        client.broadcast.emit('message_delivered', data);
        this.supportClient.send({ cmd: 'message_delivered' }, message)
          .subscribe({
            next: (result) => {
              console.log("result", result);
            },
            error: (error) => {
              console.log('Error message_read message:', error);
            },
          });
  
      });
  
      // For example, if you want to handle a custom event 'chat_message'
  
    }
  }
  