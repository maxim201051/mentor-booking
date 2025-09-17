import { App } from "aws-cdk-lib";

import { Template } from "aws-cdk-lib/assertions";
import { DynamoDbStack } from "../../lib/dynamodb-stack";

test("DynamoDbStack creates DynamoDB tables with correct properties", () => {
  const app = new App();
  const stack = new DynamoDbStack(app, "TestDynamoDbStack");
  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::DynamoDB::Table", {
    TableName: "bookings",
  });

  template.hasResourceProperties("AWS::DynamoDB::Table", {
    TableName: "mentors",
  });

  template.hasResourceProperties("AWS::DynamoDB::Table", {
    TableName: "students",
  });

  template.hasResourceProperties("AWS::DynamoDB::Table", {
    TableName: "timeslots",
  });
});