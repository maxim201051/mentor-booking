import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { mentors } from "./test-data/mentors";
import { timeSlots } from "./test-data/timeslots";
import { students } from "./test-data/students";

const dynamoDbClient = new DynamoDBClient({ region: "eu-west-2" });

const mentorsTableName = "mentors";
const timeSlotsTableName = "timeslots";
const studentsTableName = "students";

const insertMentors = async () => {
  for (const mentor of mentors) {
    const command = new PutItemCommand({
      TableName: mentorsTableName,
      Item: marshall(mentor),
    });
    await dynamoDbClient.send(command);
    console.log(`Inserted mentor: ${mentor.id}`);
  }
};

const insertTimeSlots = async () => {
  for (const timeSlot of timeSlots) {
    const command = new PutItemCommand({
      TableName: timeSlotsTableName,
      Item: marshall({
        ...timeSlot,
        startDate: timeSlot.startDate.toISOString(),
        endDate: timeSlot.endDate.toISOString(),
      }),
    });
    await dynamoDbClient.send(command);
    console.log(`Inserted time slot: ${timeSlot.id}`);
  }
};

const insertStudents = async () => {
	for (const student of students) {
		const command = new PutItemCommand({
			TableName: studentsTableName,
			Item: marshall(student),
		});
		await dynamoDbClient.send(command);
		console.log(`Inserted student: ${student.id}`);
	}
}

const insertTestData = async () => {
//   await insertMentors();
//   await insertTimeSlots();
  await insertStudents();
  console.log("Test data inserted successfully!");
};

insertTestData();
