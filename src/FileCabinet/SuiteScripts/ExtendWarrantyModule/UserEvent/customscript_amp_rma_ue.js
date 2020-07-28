/**
 *@description:
 *  RMA User Event script that handles NS contract cancellation with Extend
 *  warranty contracts.
 *
 *@copyright Extend, Inc.
 *@author Michael Draper
 *
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 *@ModuleScope Public
 */
define(['../Libs/customscript_amp_item_api', 'N/url', 'N/record'], (
  api,
  url,
  record
) => {
  var exports = {};
  exports.beforeLoad = (context) => {
    //Only execute for newly created, linked Sales Orders
    if (!validateContext(context)) return;
    // Only render refund amount button if linked Sales Order
    // contains warranty contracts from Extend
    var arrContracts = validateWarrantyOrder(context);
    // Render 'Extend Refund Amount' button to call
    // suitelet for presenting the refund amount
    // from the Extend API
    if (arrContracts.length > 0) {
      renderButton(context, arrContracts);
    }
  };
  const validateContext = (context) => {
    // Check context is CREATE
    // If not, exit the function
    if (context.type !== 'create') {
      return false;
    }
    // Check if the RMA is being created from a Sales Order
    // If not, exit the function
    var objCurrentRecord = context.newRecord;
    const stTransformType = objCurrentRecord.getValue({ fieldId: 'transform' });
    if (stTransformType !== 'salesord') {
      return false;
    }
    return true;
  };
  // Validate that the order is a warranty order
  // being returned
  const validateWarrantyOrder = (context) => {
    var arrContractIds = [];
    var objCurrentRecord = context.newRecord;
    // Get linked Sales Order Id
    const stSalesOrderId = objCurrentRecord.getValue({
      fieldId: 'transformid',
    });
    // Load the Record to obtain the line items
    const objSalesOrder = record.load({
      type: 'salesorder',
      id: stSalesOrderId,
    });
    const stLineCount = objSalesOrder.getLineCount({
      sublistId: 'item',
    });
    // Check line items from the linked Sales Order for
    // Extend contract ids
    for (let i = 0; i < stLineCount; i++) {
      const stContractId = objSalesOrder.getSublistValue({
        sublistId: 'item',
        fieldId: 'custcol_amp_ext_contract_id',
        line: i,
      });
      // If contract id exists, append to the array
      if (stContractId) {
        arrContractIds.push(stContractId);
      }
    }
    // Return contracts array
    return arrContractIds;
  };
  // Render the refund amount validation button
  const renderButton = (context, arrContractIds) => {
    var objCurrentRecord = context.newRecord;
    // Flag as a warranty order
    objCurrentRecord.setValue({
      fieldId: 'custbody_amp_ext_rma_warranty_return',
      value: true,
    });
    const objForm = context.form;
    objForm.clientScriptModulePath = '../Client/customscript_amp_rma_cs.js';
    objForm.addButton({
      id: 'custpage_amp_ext_validate_refund',
      label: 'Extend Refund Amount',
      functionName: `validateRefund(${JSON.stringify(arrContractIds)})`,
    });
  };
  exports.afterSubmit = (context) => {
    const objNewRecord = context.newRecord;
    // Check if the RMA is a 'Warranty Return'
    const bIsWarrantyReturn = objNewRecord.getValue({
      fieldId: 'custbody_amp_ext_rma_warranty_return',
    });
    if (!bIsWarrantyReturn) {
      return;
    }
    if (!validateContext(context)) return;
    // Get Contract ID(s) from line level of warranty being returned
    const stLineCount = objNewRecord.getLineCount({
      sublistId: 'item',
    });
    for (let i = 0; i < stLineCount; i++) {
      // Call Contract cancellation API or scheduled script to cancel contracts
      // for each contract ID
      var stContractId = objNewRecord.getSublistValue({
        sublistId: 'item',
        fieldId: 'custcol_amp_ext_contract_id',
        line: i,
      });
      if (stContractId) {
        log.debug(
          'AFTERSUBMIT: Cancelling Contract',
          `Contract ID: ${stContractId}`
        );
        const objResponse = api.cancelWarrantyContract(stContractId, true);
        // Write successful response to logs
        if (objResponse) {
          log.debug(
            `AFTERSUBMIT: Cancel Warranty API Response JSON for Contract ${stContractId}`,
            objResponse
          );
        }
      }
    }
  };
  return exports;
});
