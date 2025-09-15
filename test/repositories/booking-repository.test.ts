import { GetItemCommand, PutItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { BookingRepository } from "../../lib/mentor-booking-service/repositories/booking-repository";
import { BookingEntity } from "../../lib/mentor-booking-service/entities/booking-entity";

describe("BookingRepository Tests", () => {
	let mockDynamoDBClient: any; 
	const bookingsTableName = "BookingsTable";
	let bookingRepository: BookingRepository;

	beforeEach(() => {
		mockDynamoDBClient = {
		send: jest.fn(), 
		};
		bookingRepository = new BookingRepository(bookingsTableName, mockDynamoDBClient);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	test("getBookingById should return a booking when the booking exists", async () => {
		const bookingId = "123";
		const bookingResponse = {
		Item: marshall({
			id: bookingId,
			studentId: "student-1",
			mentorId: "mentor-1",
			timeslotId: "timeslot-1",
			status: "confirmed",
		}),
		};

		mockDynamoDBClient.send.mockResolvedValueOnce(bookingResponse);

		const result = await bookingRepository.getBookingById(bookingId);

		expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
		expect.objectContaining({
			input: {
			TableName: bookingsTableName,
			Key: { id: { S: bookingId } },
			},
		})
		);

		expect(result).toEqual({
		id: bookingId,
		studentId: "student-1",
		mentorId: "mentor-1",
		timeslotId: "timeslot-1",
		status: "confirmed",
		});
	});

	test("getBookingById should return null if booking does not exist", async () => {
		const bookingId = "non-existent-id";

		mockDynamoDBClient.send.mockResolvedValueOnce({});

		const result = await bookingRepository.getBookingById(bookingId);

		expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
		expect.objectContaining({
			input: {
			TableName: bookingsTableName,
			Key: { id: { S: bookingId } },
			},
		})
		);

		expect(result).toBeNull();
	});

	test("createBooking should successfully invoke PutItemCommand", async () => {
		const booking: BookingEntity = {
		id: "123",
		studentId: "student-1",
		mentorId: "mentor-1",
		timeslotId: "timeslot-1",
		status: "confirmed",
		};

		mockDynamoDBClient.send.mockResolvedValueOnce({});

		await bookingRepository.createBooking(booking);

		expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
		expect.objectContaining({
			input: {
			TableName: bookingsTableName,
			Item: marshall(booking),
			},
		})
		);
	});

	test("deleteBookingById should successfully invoke DeleteCommand", async () => {
		const bookingId = "booking-123";

		mockDynamoDBClient.send.mockResolvedValueOnce({});

		await bookingRepository.deleteBookingById(bookingId);

		expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
		expect.objectContaining({
			input: {
			TableName: bookingsTableName,
			Key: { id: bookingId },
			},
		})
		);
	});

	test("getBookingsByStudentId should return an array of bookings", async () => {
		const studentId = "student-1";

		const bookingsResponse = {
		Items: [
			marshall({
			id: "booking-1",
			studentId,
			mentorId: "mentor-1",
			timeslotId: "timeslot-1",
			status: "confirmed",
			}),
			marshall({
			id: "booking-2",
			studentId,
			mentorId: "mentor-2",
			timeslotId: "timeslot-2",
			status: "cancelled",
			}),
		],
		};

		mockDynamoDBClient.send.mockResolvedValueOnce(bookingsResponse);

		const result = await bookingRepository.getBookingsByStudentId(studentId);

		expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
		expect.objectContaining({
			input: {
			TableName: bookingsTableName,
			IndexName: "StudentBookingsIndex",
			KeyConditionExpression: "studentId = :studentId",
			ExpressionAttributeValues: {
				":studentId": { S: studentId },
			},
			},
		})
		);

		expect(result).toEqual([
		{
			id: "booking-1",
			studentId,
			mentorId: "mentor-1",
			timeslotId: "timeslot-1",
			status: "confirmed",
		},
		{
			id: "booking-2",
			studentId,
			mentorId: "mentor-2",
			timeslotId: "timeslot-2",
			status: "cancelled",
		},
		]);
	});
});