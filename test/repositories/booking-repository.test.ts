import { marshall } from "@aws-sdk/util-dynamodb";
import { BookingRepository } from "../../src/repositories/booking-repository";
import { BookingEntity } from "../../src/entities/booking-entity";

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

	test("getBookingsByMentorId should return an array of bookings for a mentor", async () => {
		const mentorId = "mentor-1";

		const bookingsResponse = {
			Items: [
				marshall({
					id: "booking-1",
					mentorId,
					studentId: "student-1",
					timeslotId: "timeslot-1",
					status: "confirmed",
				}),
			],
		};

		mockDynamoDBClient.send.mockResolvedValueOnce(bookingsResponse);

		const result = await bookingRepository.getBookingsByMentorId(mentorId);

		expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
			expect.objectContaining({
				input: {
					TableName: bookingsTableName,
					IndexName: "MentorBookingsIndex",
					KeyConditionExpression: "mentorId = :mentorId",
					ExpressionAttributeValues: {
						":mentorId": { S: mentorId },
					},
				},
			})
		);

		expect(result).toEqual([
			{
				id: "booking-1",
				mentorId,
				studentId: "student-1",
				timeslotId: "timeslot-1",
				status: "confirmed",
			},
		]);
	});

	test("getBookingsByMentorId should return an empty array if no bookings exist", async () => {
		const mentorId = "non-existent-mentor";

		const bookingsResponse = { Items: [] };

		mockDynamoDBClient.send.mockResolvedValueOnce(bookingsResponse);

		const result = await bookingRepository.getBookingsByMentorId(mentorId);

		expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
			expect.objectContaining({
				input: {
					TableName: bookingsTableName,
					IndexName: "MentorBookingsIndex",
					KeyConditionExpression: "mentorId = :mentorId",
					ExpressionAttributeValues: {
						":mentorId": { S: mentorId },
					},
				},
			})
		);

		expect(result).toEqual([]);
	});

	test("getBookingsByMentorId should throw an error if the query fails", async () => {
		const mentorId = "mentor-1";

		mockDynamoDBClient.send.mockRejectedValueOnce(new Error("DynamoDB error"));

		await expect(bookingRepository.getBookingsByMentorId(mentorId)).rejects.toThrow(
			"Failed to query bookings for mentor mentor-1"
		);

		expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
			expect.objectContaining({
				input: {
					TableName: bookingsTableName,
					IndexName: "MentorBookingsIndex",
					KeyConditionExpression: "mentorId = :mentorId",
					ExpressionAttributeValues: {
						":mentorId": { S: mentorId },
					},
				},
			})
		);
	});

	test("getAllBookings should return all bookings", async () => {
		const bookingsResponse = {
			Items: [
				marshall({
					id: "booking-1",
					studentId: "student-1",
					mentorId: "mentor-1",
					timeslotId: "timeslot-1",
					status: "confirmed",
				}),
				marshall({
					id: "booking-2",
					studentId: "student-2",
					mentorId: "mentor-2",
					timeslotId: "timeslot-2",
					status: "cancelled",
				}),
			],
		};

		mockDynamoDBClient.send.mockResolvedValueOnce(bookingsResponse);

		const result = await bookingRepository.getAllBookings();

		expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
			expect.objectContaining({
				input: {
					TableName: bookingsTableName,
				},
			})
		);

		expect(result).toEqual([
			{
				id: "booking-1",
				studentId: "student-1",
				mentorId: "mentor-1",
				timeslotId: "timeslot-1",
				status: "confirmed",
			},
			{
				id: "booking-2",
				studentId: "student-2",
				mentorId: "mentor-2",
				timeslotId: "timeslot-2",
				status: "cancelled",
			},
		]);
	});

	test("getAllBookings should return an empty array if no bookings exist", async () => {
		const bookingsResponse = { Items: [] };

		mockDynamoDBClient.send.mockResolvedValueOnce(bookingsResponse);

		const result = await bookingRepository.getAllBookings();

		expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
			expect.objectContaining({
				input: {
					TableName: bookingsTableName,
				},
			})
		);

		expect(result).toEqual([]);
	});

	test("getAllBookings should throw an error if the scan fails", async () => {
		mockDynamoDBClient.send.mockRejectedValueOnce(new Error("DynamoDB error"));

		await expect(bookingRepository.getAllBookings()).rejects.toThrow("Could not fetch bookings");

		expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
			expect.objectContaining({
				input: {
					TableName: bookingsTableName,
				},
			})
		);
	});

	test("createBooking should throw an error if the put item fails", async () => {
		const booking: BookingEntity = {
			id: "123",
			studentId: "student-1",
			mentorId: "mentor-1",
			timeslotId: "timeslot-1",
			status: "confirmed",
		};

		mockDynamoDBClient.send.mockRejectedValueOnce(new Error("DynamoDB error"));

		await expect(bookingRepository.createBooking(booking)).rejects.toThrow("Failed to create booking");

		expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
			expect.objectContaining({
				input: {
					TableName: bookingsTableName,
					Item: marshall(booking),
				},
			})
		);
	});

	test("deleteBookingById should throw an error if the delete command fails", async () => {
		const bookingId = "booking-123";

		mockDynamoDBClient.send.mockRejectedValueOnce(new Error("DynamoDB error"));

		await expect(bookingRepository.deleteBookingById(bookingId)).rejects.toThrow(
			"Failed to delete booking by ID booking-123"
		);

		expect(mockDynamoDBClient.send).toHaveBeenCalledWith(
			expect.objectContaining({
				input: {
					TableName: bookingsTableName,
					Key: { id: bookingId },
				},
			})
		);
	});
});