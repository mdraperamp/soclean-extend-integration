/**
 *@description: Refund amount suitelet controller
 *
 *@copyright Extend, Inc.
 *@author Michael Draper
 *
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 *@NModuleScope Public
 */
define(['N/url'], function (url) {
  var exports = {};
  exports.validateRefund = function (arrContractIds) {
    console.log('Calling Refund Validation for Contracts:' + arrContractIds);
    // Resolve suitelet script URL
    var stValidateRefundURL = url.resolveScript({
      scriptId: 'customscript_amp_ext_val_refund_sl',
      deploymentId: 'customdeploy_amp_ext_val_refund_sl',
      params: {
        contractIds: JSON.stringify(arrContractIds),
      },
    });
    // Open popup window to host suitelet
    window.open(
      stValidateRefundURL,
      '_blank',
      'screenX=300,screenY=300,width=900,height=300,titlebar=0,status=no,menubar=no,resizable=0,scrollbars=0'
    );
  };
  return exports;
});
