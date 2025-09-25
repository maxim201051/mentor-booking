import { MentorService } from "../../src/services/mentor-service";
import { BookingService } from "../../src/services/booking-service";
import { MentorEntity } from "../../src/entities/mentor-entity";
import { BookingEntity } from "../../src/entities/booking-entity";
import { handleGetBookingsByMentor } from "../../src/handlers/get-bookings-by-mentor";

describe("handleGetBookingsByMentor Tests", () => {
    let mockMentorService: jest.Mocked<MentorService>;
    let mockBookingService: jest.Mocked<BookingService>;

    beforeEach(() => {
        mockMentorService = {
            getMentorById: jest.fn(), 
        } as unknown as jest.Mocked<MentorService>;

        mockBookingService = {
            getBookingsByMentorIdWithFilters: jest.fn(), 
        } as unknown as jest.Mocked<BookingService>;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    const mentor: MentorEntity = {
        id: "mentor-1",
        email: "mentor@example.com",
        fullName: "John Mentor",
        skills: ["JavaScript", "AWS", "React"],
        experience: 5,
    };

    const bookings: BookingEntity[] = [
        {
            id: "booking-1",
            mentorId: "mentor-1",
            studentId: "student-1",
            timeslotId: "timeslot-1",
            status: "confirmed",
        },
        {
            id: "booking-2",
            mentorId: "mentor-1",
            studentId: "student-2",
            timeslotId: "timeslot-2",
            status: "completed",
        },
    ];

    const eventWithValidMentorId = {
        pathParameters: { mentorId: "mentor-1" },
        queryStringParameters: { type: "upcoming" },
    };

    test("handleGetBookingsByMentor should return filtered bookings for a valid mentor", async () => {
        mockMentorService.getMentorById.mockResolvedValueOnce(mentor);
        mockBookingService.getBookingsByMentorIdWithFilters.mockResolvedValueOnce(bookings);

        const result = await handleGetBookingsByMentor(eventWithValidMentorId, {
            mentorService: mockMentorService,
            bookingService: mockBookingService,
        });

        expect(result).toEqual({
            statusCode: 200,
            body: JSON.stringify(bookings),
        });

        expect(mockMentorService.getMentorById).toHaveBeenCalledWith("mentor-1");
        expect(mockBookingService.getBookingsByMentorIdWithFilters).toHaveBeenCalledWith(
            "mentor-1",
            { type: "upcoming" }
        );
    });

    test("handleGetBookingsByMentor should return error if 'mentorId' is missing", async () => {
        const event = { ...eventWithValidMentorId, pathParameters: null };

        const result = await handleGetBookingsByMentor(event, {
            mentorService: mockMentorService,
            bookingService: mockBookingService,
        });

        expect(result).toEqual({
            statusCode: 400,
            body: JSON.stringify({
                error: "mentorId is required in the path parameters",
            }),
        });

        expect(mockMentorService.getMentorById).not.toHaveBeenCalled();
        expect(mockBookingService.getBookingsByMentorIdWithFilters).not.toHaveBeenCalled();
    });

    test("handleGetBookingsByMentor should return error if mentor does not exist", async () => {
        mockMentorService.getMentorById.mockResolvedValueOnce(null);

        const result = await handleGetBookingsByMentor(eventWithValidMentorId, {
            mentorService: mockMentorService,
            bookingService: mockBookingService,
        });

        expect(result).toEqual({
            statusCode: 400,
            body: JSON.stringify({
                error: "Mentor with such id does not exits",
            }),
        });

        expect(mockMentorService.getMentorById).toHaveBeenCalledWith("mentor-1");
        expect(mockBookingService.getBookingsByMentorIdWithFilters).not.toHaveBeenCalled();
    });

    test("handleGetBookingsByMentor should return 500 for unexpected errors", async () => {
        mockMentorService.getMentorById.mockRejectedValueOnce(new Error("Unexpected error"));

        const result = await handleGetBookingsByMentor(eventWithValidMentorId, {
            mentorService: mockMentorService,
            bookingService: mockBookingService,
        });

        expect(result).toEqual({
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        });

        expect(mockMentorService.getMentorById).toHaveBeenCalledWith("mentor-1");
        expect(mockBookingService.getBookingsByMentorIdWithFilters).not.toHaveBeenCalled();
    });
});