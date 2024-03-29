// NPM IMPORTS //
const Validator = require('validator');
const isEmpty = require('is-empty');

/**
 * Function to validate input on the report submission input.
 */
module.exports = function validateReportSubmissionInput(data) {
    const errors = {};

    data.reported = !isEmpty(data.reported) ? data.reported : '';
    data.reporter = !isEmpty(data.reporter) ? data.reporter : '';
    data.category = !isEmpty(data.category) ? data.category : '';
    data.text = !isEmpty(data.text) ? data.text : '';

    if (Validator.isEmpty(data.reported)) {
        errors.name = 'Name field is required.';
    }

    if (Validator.isEmpty(data.category)) {
        errors.category = "Category field is required."
    }

    if (Validator.isEmpty(data.text)) {
        errors.text = "Report text field is required."
    }

    return {
        errors,
        isValid: isEmpty(errors),
    };

};
