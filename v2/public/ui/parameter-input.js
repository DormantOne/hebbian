export function getNumberParamById(id, errorMessages){
    const inputElement = document.getElementById(id);
    if(!inputElement){
        errorMessages.push(`No input element with ID "${id}" found.`);
        return null;
    }
    const valueToValidate = inputElement.value;
    const numberValue = Number(valueToValidate);
    if(isNaN(numberValue)){
        errorMessages.push(`Input element with ID "${id}" does not contain a valid number.`);
        return null;
    }
    return numberValue;
}

export function getStringRadio(name,errorMessages){
    const targetElements = document.querySelectorAll(`[name="${name}"]`);
    if(targetElements.length === 0){
        errorMessages.push(`No input element with name "${name}" found.`);
        return null;
    }
    let valueToValidate = null;
    if(targetElements.length > 1){
        let isCheckedCount = 0;
        targetElements.forEach((element) => {
            if(element.checked){
                isCheckedCount++;
            }
        });
        if(isCheckedCount === 0){
            errorMessages.push(`No input element with name "${name}" is checked.`);
            return null;
        }
        if(isCheckedCount > 1){
            errorMessages.push(`Multiple input elements with name "${name}" are checked.`);
            return null;
        }
        valueToValidate = targetElements[0].value;
    }else{
        valueToValidate = targetElements[0].value;
    }
    if(typeof valueToValidate!=='string' || valueToValidate.trim() === ''){
        errorMessages.push(`Input element with name "${name}" does not contain a (non empty) string value.`);
        return null;
    }
    return valueToValidate
}