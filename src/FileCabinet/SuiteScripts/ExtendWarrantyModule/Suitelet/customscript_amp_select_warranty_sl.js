/**
 *@description: 
 *  Suitelet called by Sales Order client script to display warrant products
 *  in a popup window. The user can then select a warranty and on submit, 
 *  the suitelet will post and append a new line for the Warranty non-inventory item 
 *  with the description and pricing. 
 *  
 *@copyright Aimpoint Technology Services, LLC
 *@author Michael Draper
 * 
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define([
    'N/ui/serverWidget',
    'N/search',
    'N/http',
    'N/error',
    '../Libs/customscript_amp_util'
], 
(ui, search, http, error, util) => {
    const exports = {};

    exports.onRequest = context => {
        var objEventRouter = {};
        objEventRouter[http.Method.GET] = handleGet;
        objEventRouter[http.Method.POST] = handlePost;

        if(!objEventRouter[context.request.method]){
            handleError(context);
        }
        objEventRouter[context.request.method](context);
    };
    handleGet = context => {
        
        renderForm(context);
    }
    // Post Handler
    handlePost = context => {

        log.debug('POST: Context Object', JSON.stringify(context));

        const request = context.request;
        const planCount = request.getLineCount({group: 'custpage_plans'});
        
        var stItemId = '';
        // Get line information from selected line
        for(let i=0; i < planCount; i++){

            let isSelected = request.getSublistValue({group: 'custpage_plans', name: 'custpage_select', line: i}) == "T" ? true : false;

            if(isSelected){

                stItemId = request.getSublistValue({group: 'custpage_plans', name: 'custpage_item_id', line: i});
                break;
            }
        }
        // Prepare window.opener html to post values back to the line
        var html = '<html>';
        html += ' <body>';
        html += ' <script language="JavaScript">';
        html += ' if(window.opener) {';
        html += ` window.opener.nlapiSetCurrentLineItemValue("item", "item", ${stItemId}, true, true);`;
        html += ' };';
        html += ' window.close();';
        html += ' </script>';
        html += ' </body>';
        html += '</html>';
        // Write repsponse
        context.response.write(html);
    }
    handleError = context => {

        throw error.create({
            name: "SSS_UNSUPPORTED_REQUEST_TYPE",
            message: "Suitelet only supports GET and POST",
            notifyOff: true
        });
    }
    // Builds Suitelet Form
    renderForm = context => {

        log.debug('POST Params', context.request.parameters);
        // Get plans and populate sublist
        const stItemInternalId = context.request.parameters.stItemInternalId;

        // Create the form
        var objForm = ui.createForm({
            title: 'Extend Warranty Plans',
            hideNavBar: true
        });
        // Add plans sublist
        var objPlanList = objForm.addSublist({
            id : 'custpage_plans',
            type : ui.SublistType.LIST,
            label : 'Eligble Plans'
        });
       objPlanList.addField({
            id : 'custpage_select',
            type : ui.FieldType.CHECKBOX,
            label : 'Select'
        });
        var objItemIdField = objPlanList.addField({
            id: 'custpage_item_id',
            type: ui.FieldType.INTEGER,
            label: 'ID'
        });
        objItemIdField.updateDisplayType({
            displayType: ui.FieldDisplayType.HIDDEN
        });
        objPlanList.addField({
            id: 'custpage_plan_title',
            type: ui.FieldType.TEXT,
            label: 'Title'
        });
        objPlanList.addField({
            id: 'custpage_plan_price',
            type: ui.FieldType.CURRENCY,
            label: 'Price'
        });
        // Add Submit Button
        objForm.addSubmitButton('Submit');

        // Search for warranty items for the give inventory item
        var arrFilters = [];
        arrFilters.push(search.createFilter({name: 'custitem_amp_ext_inv_sku', operator: 'anyof', values: [stItemInternalId]}));
        
        var arrColumns = [];
        arrColumns.push(search.createColumn({name: 'internalid'}));
        arrColumns.push(search.createColumn({name: 'salesdescription'}));
        arrColumns.push(search.createColumn({name: 'baseprice', sort: search.Sort.ASC}));
        
        var arrPlans = util.search('item', null, arrFilters, arrColumns);

        log.debug('Array of Plans', arrPlans);
        
        //Populate Sublist Values
        for(let i =0; i < arrPlans.length; i++){

            objPlanList.setSublistValue({
                id: 'custpage_item_id',
                line: i,
                value: arrPlans[i].getValue({name: 'internalid'})
            });
            objPlanList.setSublistValue({
                id: 'custpage_plan_title',
                line: i,
                value: arrPlans[i].getValue({name: 'salesdescription'})
            });
            objPlanList.setSublistValue({
                id: 'custpage_plan_price',
                line: i,
                value: parseFloat(arrPlans[i].getValue({name: 'baseprice'}))
            });
        }
        //Set Client handler
        objForm.clientScriptModulePath = '../Client/customscript_amp_present_handler_cs.js';
        //Write Page
        context.response.writePage(objForm);
    }
    return exports;

});