import { DynamoDBClient, GetItemCommand, PutItemCommand, QueryCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { BookingEntity } from "../entities/booking-entity";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { dynamodbUtils } from "../utils/dynamodb-utils";

export class BookingRepository {
    private readonly dynamoDBClient: DynamoDBClient;
    private readonly bookingsTableName: string;

    constructor(bookingsTableName: string, dynamoDBClient: DynamoDBClient) {
        this.bookingsTableName = bookingsTableName;
        this.dynamoDBClient = dynamoDBClient;
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
            console.error(`Error getting booking by ID ${bookingId}:`, error);
            throw new Error(`Failed to get booking by ID ${bookingId}`);
        }
    }

    async createBooking(booking: BookingEntity): Promise<void> {
        try {
            const command = new PutItemCommand({
                TableName: this.bookingsTableName,
                Item: marshall(booking),
            });
            await this.dynamoDBClient.send(command);
        } catch (error) {
            console.error('Error creating booking:', error);
            throw new Error('Failed to create booking');
        }
    }

    async deleteBookingById(bookingId: string): Promise<void> {
        try {
            const command = new DeleteCommand({
                TableName: this.bookingsTableName,
                Key: {
                    id: bookingId,
                },
            });
            await this.dynamoDBClient.send(command);
        } catch (error) {
            console.error(`Error deleting booking by ID ${bookingId}:`, error);
            throw new Error(`Failed to delete booking by ID ${bookingId}`);
        }
    }

    async getBookingsByStudentId(studentId: string): Promise<BookingEntity[]> {
        try {
            const command = new QueryCommand({
                TableName: this.bookingsTableName,
                IndexName: "StudentBookingsIndex",
                KeyConditionExpression: "studentId = :studentId",
                ExpressionAttributeValues: {
                    ":studentId": { S: studentId },
                },
            });
            const bookingsResponse = await this.dynamoDBClient.send(command);
            const bookings = bookingsResponse.Items?.map((item) => unmarshall(item) as BookingEntity) || [];
            return bookings;
        } catch (error) {
            console.error(`Error querying bookings for student ${studentId}:`, error);
            throw new Error(`Failed to query bookings for student ${studentId}`);
        }
    }

    async getBookingsByMentorIdWithFilters(mentorId: string): Promise<BookingEntity[]> {
        try {
            const command = new QueryCommand({
                TableName: this.bookingsTableName,
                IndexName: "MentorBookingsIndex",
                KeyConditionExpression: "mentorId = :mentorId",
                ExpressionAttributeValues: {
                    ":mentorId": { S: mentorId },
                },
            });
            const bookingsResponse = await this.dynamoDBClient.send(command);
            const bookings = bookingsResponse.Items?.map((item) => unmarshall(item) as BookingEntity) || [];
            return bookings;
        } catch (error) {
            console.error(`Error querying bookings for mentor ${mentorId}:`, error);
            throw new Error(`Failed to query bookings for mentor ${mentorId}`);
        }
    }

    async getAllBookings(): Promise<BookingEntity[]> {
        try {
            const bookingsScanCommand = new ScanCommand({
                TableName: this.bookingsTableName,
            });

            const bookingsResponse = await this.dynamoDBClient.send(bookingsScanCommand);
            const bookings = bookingsResponse.Items?.map((item) => unmarshall(item) as BookingEntity) || [];
            return bookings;
        } catch (error: any) {
            console.error("Error fetching all bookings:", error);
            throw new Error("Could not fetch bookings");
        }
    }
}