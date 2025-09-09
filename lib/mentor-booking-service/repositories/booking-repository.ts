import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { BookingEntity } from "../entities/booking-entity";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";

export class BookingRepository {
    private readonly dynamoDBClient: DynamoDBClient;
    private readonly bookingsTableName: string;

    constructor(bookingsTableName: string, region?: string) {
        this.bookingsTableName = bookingsTableName;
        this.dynamoDBClient = new DynamoDBClient({ region: region });
    }

    async getBookingById(bookingId: string): Promise<BookingEntity|null> {
        try {
            const command = new GetItemCommand({
                TableName: this.bookingsTableName,
                Key: {
                  id: { S: bookingId },
                },
              });
        
              const bookingResponse = await this.dynamoDBClient.send(command);
        
              return bookingResponse.Item ? (unmarshall(bookingResponse.Item) as BookingEntity) : null
        } catch (error) {
            console.error('Error getting booking by id:', error);
            throw new Error('Failed to get booking by id');
        }
    }

    async deleteBookingById(bookingId: string): Promise<void> {
        try {
            const command = new DeleteCommand({
                TableName: this.bookingsTableName,
                Key: {
                    id: { S: bookingId },
                },
            });
            await this.dynamoDBClient.send(command);
        } catch (error) {
            console.error('Error deleting booking by id:', error);
            throw new Error('Failed to delete booking by id');
        }
    }

}