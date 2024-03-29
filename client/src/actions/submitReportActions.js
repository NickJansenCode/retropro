import axios from "axios";

import {
    GET_ERRORS,

} from "./types";


export const submitReport = (reportData, history) => dispatch => {
    axios
        .post("/api/reports/submitReport", reportData)
        .then(res => history.push("/"))
        .catch(err => dispatch({
            type: GET_ERRORS,
            payload: err.response.data
        }));
}
