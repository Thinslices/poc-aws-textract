function isVendor(field) {
  if (field.GroupProperties) {
    return field.GroupProperties.some(
      (g) => g.Types && g.Types.includes("VENDOR")
    );
  }
  return field.Type.Text.indexOf("VENDOR") !== -1;
}
function isReceiver(field) {
  if (field.GroupProperties) {
    return field.GroupProperties.some(
      (g) => g.Types && g.Types.includes("RECEIVER")
    );
  }
  return field.Type.Text.indexOf("RECEIVER") !== -1;
}
function removeKey(obj, keyToRemove) {
  return JSON.parse(
    JSON.stringify(obj, (key, val) => (key === keyToRemove ? undefined : val))
  );
}
const mapFields = {
  INVOICE_RECEIPT_ID: { key: "invoiceReceiptId", label: "Id" },
  INVOICE_RECEIPT_DATE: { key: "invoiceReceiptDate", label: "Date" },
  DUEDATE: { key: "dueDate", label: "DueDate" },
  ORDER_DATE: { key: "orderDate", label: "OrderDate" },
  DELIVERY_DATE: { key: "deliveryDate", label: "DeliveryDate" },
  SERVICE_CHARGE: { key: "serviceCharge", label: "ServiceCharge" },
  GRATUITY: { key: "gratuity", label: "Gratuity" },
  TOTAL: { key: "total", label: "Total" },
  TAX: { key: "tax", label: "Tax" },
  SUBTOTAL: { key: "subtotal", label: "Subtotal" },
  DISCOUNT: { key: "discount", label: "Discount" },
  AMOUNT_PAID: { key: "amountPaid", label: "AmountPaid" },
  TAX_PAYER_ID: { key: "taxPayerId", label: "Tax Payer ID" },
  RECEIVER_NAME: { key: "name", label: "Name" },
  RECEIVER_ADDRESS: { key: "address", label: "Address" },
  RECEIVER_VAT_NUMBER: { key: "VATNumber", label: "VAT number" },
  RECEIVER_GST_NUMBER: { key: "GSTNumber", label: "GST number" },
  RECEIVER_PAN_NUMBER: { key: "PANNumber", label: "PAN number" },
  RECEIVER_ABN_NUMBER: { key: "ABNNumber", label: "ABN number" },
  VENDOR_VAT_NUMBER: { key: "VATNumber", label: "VAT number" },
  VENDOR_GST_NUMBER: { key: "GSTNumber", label: "GST number" },
  VENDOR_PAN_NUMBER: { key: "PANNumber", label: "PAN number" },
  VENDOR_ABN_NUMBER: { key: "ABNNumber", label: "ABN number" },
  ADDRESS: { key: "address", label: "Address" },
  ZIP_CODE: { key: "zipCode", label: "Zip Code" },
  CITY: { key: "city", label: "City" },
  STREET: { key: "street", label: "Street" },
  STATE: { key: "state", label: "State" },
  COUNTRY: { key: "country", label: "Country" },
  PHONE: { key: "phone", label: "Phone" },
};

const mapItem = {
  QUANTITY: { key: "quantity", label: "Quantity" },
  ITEM: { key: "item", label: "Item" },
  UNIT_PRICE: { key: "unitPrice", label: "Unit price" },
  PRICE: { key: "unitPrice", label: "Unit price" },
  OTHER: { key: "other", label: "" },
};
const updateDefaultResponse = (response, key, value, confidence, label) => {
  const currentCondidence = response[key]?.confidence ?? 0;
  if (response[key]) {
    if (currentCondidence < confidence) {
      return {
        ...response,
        [key]: {
          value,
          confidence,
          label,
        },
      };
    }
    return {
      ...response,
    };
  }
  return {
    ...response,
    [key]: {
      value,
      confidence,
      label,
    },
  };
};

const updateReceiverResponse = (response, key, value, confidence, label) => {
  const receiver = updateDefaultResponse(
    response.receiver,
    key,
    value,
    confidence,
    label
  );
  return {
    ...response,
    receiver,
  };
};

const updateVendorResponse = (response, key, value, confidence, label) => {
  const vendor = updateDefaultResponse(
    response.vendor,
    key,
    value,
    confidence,
    label
  );
  return {
    ...response,
    vendor,
  };
};

const processField = (response, field, map) => {
  const type = field.Type.Text;
  const value = field.ValueDetection.Text;
  const confidence = field.Type.Confidence;
  if (map[type]) {
    if (isReceiver(field)) {
      return updateReceiverResponse(
        response,
        map[type].key,
        value,
        confidence,
        map[type].label
      );
    }
    if (isVendor(field)) {
      return updateVendorResponse(
        response,
        map[type].key,
        value,
        confidence,
        map[type].label
      );
    }
    return updateDefaultResponse(
      response,
      map[type].key,
      value,
      confidence,
      map[type].label
    );
  }
  return response;
};
const processSummaryFields = (response, summaryFields, map) => {
  return summaryFields.reduce((acc, field) => {
    return processField(acc, field, map);
  }, response);
};

const processLineItems = (response, lineItemGroups, map) => {
  let updatedResponse = { ...response };
  lineItemGroups.forEach((lintItemGroup) => {
    lintItemGroup.LineItems.forEach((lineItem) => {
      const item = lineItem.LineItemExpenseFields.reduce((acc, field) => {
        const type = field.Type.Text;
        const value = field.ValueDetection.Text;
        if (map[type]) {
          const key = map[type].key;

          const label = key === "other" ? "Other" : map[type].label;
          return {
            ...acc,
            [key]: value,
          };
        }
        return {
          ...acc,
        };
      }, {});
      updatedResponse.items.push(item);
    });
  });
  return updatedResponse;
};

const processDocument = (document) => {
  let response = { vendor: {}, receiver: {}, items: [] };
  response = processSummaryFields(response, document.SummaryFields, mapFields);
  response = removeKey(response, "confidence");
  response = processLineItems(response, document.LineItemGroups, mapItem);

  return response;
};
const toInvoice = (data) => {
  try {
    return data.ExpenseDocuments.map((document) =>
      processDocument(document)
    ).reduce(
      (acc, current) => {
        return {
          ...acc,
          ...current,
          vendor: {
            ...acc.vendor,
            ...current.vendor,
          },
          receiver: {
            ...acc.receiver,
            ...current.receiver,
          },
          items: [...acc.items, ...current.items],
        };
      },
      {
        vendor: {},
        receiver: {},
        items: [],
      }
    );
  } catch (err) {
    console.log("Error", err);
  }
};

export { toInvoice };
