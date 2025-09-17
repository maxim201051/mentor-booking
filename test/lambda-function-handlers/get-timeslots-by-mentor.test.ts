import { main } from "../../src/handlers/get-timeslots-by-mentor";
import { MentorService } from "../../src/services/mentor-service";
import { TimeSlotService } from "../../src/services/timeslot-service";

jest.mock("../../lib/mentor-booking-service/services/mentor-service");
jest.mock("../../lib/mentor-booking-service/services/timeslot-service");

describe("get-timeslots-by-mentor handler", () => {
    let mockIsMentorExist: jest.Mock;
    let mockGetTimeslotsByMentor: jest.Mock;

    beforeEach(() => {
        mockIsMentorExist = jest.fn();
        (MentorService as jest.Mock).mockImplementation(() => ({
        isMentorExist: mockIsMentorExist,
        }));

        mockGetTimeslotsByMentor = jest.fn();
        (TimeSlotService as jest.Mock).mockImplementation(() => ({
        getTimeslotsByMentor: mockGetTimeslotsByMentor,
        }));
    });

    test("should return 400 if mentorId is missing", async () => {
        const response = await main({ pathParameters: {} });
        expect(response).toEqual({
        statusCode: 400,
        body: JSON.stringify({ error: "mentorId is required in the path parameters" }),
        });
    });

    test("should return 400 if mentor does not exist", async () => {
        mockIsMentorExist.mockResolvedValue(false);

        const response = await main(
            { pathParameters: { mentorId: "mentor-1" } },
        );

        expect(response).toEqual({
        statusCode: 400,
        body: JSON.stringify({ error: "Mentor with such id does not exist" }),
        });
    });

    test("should return time slots for mentor", async () => {
        mockIsMentorExist.mockResolvedValue(true);

        mockGetTimeslotsByMentor.mockResolvedValue([
        {
            id: "timeslot-1",
            mentorId: "mentor-1",
            startDate: new Date("2023-10-01T10:00:00.000Z"),
            endDate: new Date("2023-10-01T11:00:00.000Z"),
            isBooked: false,
        },
        ]);

        const response = await main(
            { pathParameters: { mentorId: "mentor-1" } },
        );

        expect(response).toEqual({
        statusCode: 200,
        body: JSON.stringify([
            {
            id: "timeslot-1",
            mentorId: "mentor-1",
            startDate: new Date("2023-10-01T10:00:00.000Z"),
            endDate: new Date("2023-10-01T11:00:00.000Z"),
            isBooked: false,
            },
        ]),
        });
    });

    test("should handle errors", async () => {
        mockIsMentorExist.mockRejectedValue(new Error("Error"));

        const response = await main(
            { pathParameters: { mentorId: "mentor-1" } },
        );

        expect(response).toEqual({
        statusCode: 500,
        body: JSON.stringify({ error: "Internal Server Error" }),
        });
    });
});