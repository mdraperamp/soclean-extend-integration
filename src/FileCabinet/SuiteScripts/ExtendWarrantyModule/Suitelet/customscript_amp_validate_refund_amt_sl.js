/**
 *@description:
 *  Suitelet called by button action on the RMA record that
 *  will call the contract cancellation API to validate the
 *  Extend refund amount and present it to the CSR
 *
 *@copyright Extend, Inc.
 *@author Michael Draper
 *
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 *@ModuleScope Public
 */
define(['../Libs/customscript_amp_item_api', 'N/ui/serverWidget', 'N/http'], (
  api,
  ui,
  http
) => {
  const exports = {};

  exports.onRequest = (context) => {
    var objEventRouter = {};
    objEventRouter[http.Method.GET] = handleGet;
    objEventRouter[http.Method.POST] = handlePost;
    objEventRouter[context.request.method](context);
  };
  handleGet = (context) => {
    renderForm(context);
  };
  handlePost = (context) => {
    // Prepare window.opener html to post values back to the line
    var html = '<html>';
    html += ' <body>';
    html += ' <script language="JavaScript">';
    html += ' window.close();';
    html += ' </script>';
    html += ' </body>';
    html += '</html>';
    // Write repsponse
    context.response.write(html);
  };
  renderForm = (context) => {
    // Create the form
    var objForm = ui.createForm({
      title: 'Extend Refund Amounts',
      hideNavBar: true,
    });
    // Add amount sublist
    var objList = objForm.addSublist({
      id: 'custpage_amounts',
      type: ui.SublistType.LIST,
      label: 'Refund Amounts',
    });
    objList.addField({
      id: 'custpage_serial_number',
      type: ui.FieldType.TEXT,
      label: 'Serial Number',
    });
    objList.addField({
      id: 'custpage_item_name',
      type: ui.FieldType.TEXT,
      label: 'SKU',
    });
    objList.addField({
      id: 'custpage_contract',
      type: ui.FieldType.TEXT,
      label: 'Extend Warranty Contract',
    });
    objList.addField({
      id: 'custpage_refund_amount',
      type: ui.FieldType.CURRENCY,
      label: 'Extend Refund Amount',
    });
    objForm.addSubmitButton('Confirm/Close');

    const arrContractIds = JSON.parse(context.request.parameters.contractIds);
    log.debug('RENDERFORM: URL Params', `Contracts: ${arrContractIds}`);

    for (let i = 0; i < arrContractIds.length; i++) {
      const response = api.cancelWarrantyContract(arrContractIds[i], false);
      log.debug('RENDERFORM: API Response', response);

      objList.setSublistValue({
        id: 'custpage_serial_number',
        line: i,
        value: response.product.serialNumber,
      });
      objList.setSublistValue({
        id: 'custpage_item_name',
        line: i,
        value: response.product.referenceId,
      });
      objList.setSublistValue({
        id: 'custpage_contract',
        line: i,
        value: response.id,
      });
      objList.setSublistValue({
        id: 'custpage_refund_amount',
        line: i,
        value: parseFloat(response.refundAmount.amount / 100),
      });
    }
    context.response.writePage(objForm);
  };
  return exports;
});
