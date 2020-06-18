/**
 *@description: 
 *  Suitelet called by Sales Order client script to display warrant products
 *  in a popup window. This script makes an outbound api call to the GET plans
 *  Extend API and displays the available warranty products. The user can then
 *  select a warranty and on submit, the suitelet will post and append a new 
 *  line for the Warranty non inventory item with the description and pricing. 
 *  
 *@copyright Aimpoint Technology Services, LLC
 *@author Michael Draper
 * 
 *@NApiVersion 2.1
 *@NScriptType Suitelet
 */
define([
    'N/ui/serverWidget',
    'N/http',
    '../Libs/customscript_amp_item_api'
], 
(ui, http, api) => {
    const exports = {};
    //List of non inventory items for warranty listing on Saled Transactions
    const objNonInvItems = {
        "GENERIC" : 2589
    };

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
    handlePost = context => {

        log.debug('POST: Context Object', JSON.stringify(context));

        const request = context.request;
        const planCount = request.getLineCount({group: 'custpage_plans'});
        
        var stPlanId = '';
        var flPrice = 0;
        var stItemId = '';

        for(let i=0; i < planCount; i++){

            let isSelected = request.getSublistValue({group: 'custpage_plans', name: 'custpage_select', line: i}) == "T" ? true : false;
            log.debug('Is Selected Checkbox Value', isSelected);

            if(isSelected){

                stItemId = request.getSublistValue({group: 'custpage_plans', name: 'custpage_item_id', line: i});
                stPlanId = JSON.stringify(request.getSublistValue({group: 'custpage_plans', name: 'custpage_plan_id', line: i}));
                stTitle = request.getSublistValue({group: 'custpage_plans', name: 'custpage_plan_title', line: i});
                intTerm = request.getSublistValue({group: 'custpage_plans', name: 'custpage_plan_term', line: i});
                flPrice = request.getSublistValue({group: 'custpage_plans', name: 'custpage_plan_price', line: i});
                break;
            }
        }
        log.debug('Values', `planId: ${stPlanId}, term: ${intTerm}, price: ${flPrice}`);

        var html = '<html>';
        html += ' <body>';
        html += ' <script language="JavaScript">';
        html += ' if(window.opener) {';
        html += ` window.opener.nlapiSetCurrentLineItemValue("item", "item", ${objNonInvItems.GENERIC}, true, true);`;
        // html += ` window.opener.nlapiSetCurrentLineItemValue("item", "description", ${stTitle}, false);`;
        html += ` window.opener.nlapiSetCurrentLineItemValue("item", "rate", ${flPrice}, true);`;
        html += ` window.opener.nlapiSetCurrentLineItemValue("item", "custcol_amp_extend_plan_id", ${stPlanId}, true);`;
        html += ` window.opener.nlapiSetCurrentLineItemValue("item", "custcol_amp_extend_item_sku", ${stItemId}, true);`;
        html += ' };';
        html += ' window.close();';
        html += ' </script>';
        html += ' </body>';
        html += '</html>';

        context.response.write(html);
    }
    handleError = context => {

        throw error.create({
            name: "SSS_UNSUPPORTED_REQUEST_TYPE",
            message: "Suitelet only supports GET and POST",
            notifyOff: true
        });
    }
    renderForm = context => {

        log.debug('POST Params', context.request.parameters);
        // Get plans and populate sublist
        const stItemId = context.request.parameters.stItemId;
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
            id : 'custpage_item_id',
            type : ui.FieldType.INTEGER,
            label : 'Item'
        });
        objItemIdField.defaultValue = stItemInternalId;
        objItemIdField.updateDisplayType({
            displayType: ui.FieldDisplayType.HIDDEN
        });
        objPlanList.addField({
            id: 'custpage_plan_id',
            type: ui.FieldType.TEXT,
            label: 'ID'
        });
        objPlanList.addField({
            id: 'custpage_plan_title',
            type: ui.FieldType.TEXT,
            label: 'Title'
        });
        objPlanList.addField({
            id: 'custpage_plan_term',
            type: ui.FieldType.INTEGER,
            label: 'Term'
        });
        objPlanList.addField({
            id: 'custpage_plan_price',
            type: ui.FieldType.CURRENCY,
            label: 'Price'
        });
        // Add Submit Button
        objForm.addSubmitButton('Submit');
        // Call Plan API to get list of plans by item
        const objPlans = api.getPlansByItem(stItemId);
        log.debug('Response from Plan API', objPlans);
        
        const arrPlans = objPlans.plans;
        log.debug('Array of Plans', arrPlans);
        
        //Populate Sublist Values
        for(let i =0; i < arrPlans.length; i++){

            objPlanList.setSublistValue({
                id: 'custpage_plan_id',
                line: i,
                value: arrPlans[i].id
            });
            objPlanList.setSublistValue({
                id: 'custpage_plan_title',
                line: i,
                value: arrPlans[i].title
            });
            objPlanList.setSublistValue({
                id: 'custpage_plan_term',
                line: i,
                value: arrPlans[i].contract.termLength
            });
            objPlanList.setSublistValue({
                id: 'custpage_plan_price',
                line: i,
                value: parseFloat(arrPlans[i].price / 100)
            });
        }
        //Set Client handler
        objForm.clientScriptModulePath = '../Client/customscript_amp_present_handler_cs.js';
        //Write Page
        context.response.writePage(objForm);
    }
    return exports;

});