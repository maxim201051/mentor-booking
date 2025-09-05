import { main } from "../../lib/mentor-booking-service/get-mentors-list";
import { MentorService } from "../../lib/mentor-booking-service/services/mentor-service";

// Mock the MentorService module
jest.mock("../../lib/mentor-booking-service/services/mentor-service");

describe("get-mentors-list handler", () => {
  let mockGetAllMentors: jest.Mock;

  beforeEach(() => {
    // Mock the `getAllMentors` method on the global `mentorService` instance
    mockGetAllMentors = jest.fn();
    (MentorService as jest.Mock).mockImplementation(() => ({
      getAllMentors: mockGetAllMentors,
    }));
  });

  test("should return mentors", async () => {
    // Mock the return value of `getAllMentors`
    mockGetAllMentors.mockResolvedValue([
      {
        id: "mentor-1",
        name: "John Doe",
        email: "john.doe@example.com",
        skills: ["JavaScript"],
        experience: 5,
      },
    ]);

    const response = await main();

    expect(response).toEqual({
      statusCode: 200,
      body: JSON.stringify([
        {
          id: "mentor-1",
          name: "John Doe",
          email: "john.doe@example.com",
          skills: ["JavaScript"],
          experience: 5,
        },
      ]),
    });
  });

  test("should handle errors", async () => {
    // Mock `getAllMentors` to throw an error
    mockGetAllMentors.mockRejectedValue(new Error("Error"));

    const response = await main();

    expect(response).toEqual({
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    });
  });
});