/**
 *@description: 
 *    
 *@copyright Aimpoint Technology Services, LLC
 *@author Michael Draper
 * 
 *@NApiVersion 2.1
 *@NScriptType UserEventScript
 *@ModuleScope Public
 */
define([
    'N/search',
    '../Libs/customscript_amp_util',
], 
(search, util) => {
    var exports = {};
    exports.beforeSubmit = context => {
        const objNewRecord = context.newRecord;
       
        try {
            const stItemLineCount = objNewRecord.getLineCount({sublistId: 'item'});
            objNewRecord.setValue({fieldId: 'custbody_amp_ext_to_be_processed', value: true});

            for(let i = 0; i < stItemLineCount; i++){
                var arrFieldLookup = search.lookupFields({
                    type: 'item',
                    id: objNewRecord.getSublistValue({sublistid: 'item', fieldId: 'item'}),
                    columns: ['type', 'custitem_amp_ext_sku']
                });
                if(arrFieldLookup.indexOf('noninventoryitem') > -1 && util.isNotEmpty(arrFieldLookup.custitem_amp_ext_sku)){
                    objNewRecord.setValue({fieldId: 'custbody_amp_ext_to_be_processed', value: true});
                    break;
                }
            }
        } catch(e) {
            log.debug('Extend: Error Setting Extend Field for Job', JSON.stringify(e));
        }
    };
    return exports;
});