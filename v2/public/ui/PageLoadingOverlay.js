export default class PageLoadingOverlay {
    static show(){
        document.querySelector(".PageLoadingOverlay").style.display = "flex";
    }
    static hide(){
        document.querySelector(".PageLoadingOverlay").style.display = "none";
    }
}