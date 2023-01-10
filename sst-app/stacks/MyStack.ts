import {
  StackContext,
  Api,
  Bucket,
  Table,
  Function,
} from "@serverless-stack/resources";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { EventType } from "aws-cdk-lib/aws-s3";

export function MyStack({ stack }: StackContext) {
  const invoiceObjectsTable = new Table(stack, "InvoiceObjects", {
    fields: {
      id: "string",
      amount: "number",
      date: "string",
    },
    primaryIndex: {
      partitionKey: "id",
    },
  });

  const invoiceUploadFunction = new Function(stack, "InvoiceUpload", {
    handler: "functions/invoice-upload.handler",
    bind: [invoiceObjectsTable],
    permissions: [
      "s3:GetObject",
      "textract:StartExpenseAnalysis",
      "textract:GetDocumentAnalysis",
    ],
  });

  const uploadedInvoicesBucket = new Bucket(stack, "UploadedInvoices", {
    notifications: {
      UploadedInvoiceNotification: {
        function: invoiceUploadFunction,
        events: ["object_created"],
      },
    },
  });

  const api = new Api(stack, "api", {
    routes: {
      "GET /": "functions/lambda.handler",
    },
  });

  stack.addOutputs({
    ApiEndpoint: api.url,
  });
}
