class ApiError extends Error {
    constructor({
        statusCode,
        message = "something Went Wrong",
        errors = [],
        stack=""
    }) {
        super(message)
        this.statusCode=statusCode,
        this.errors=errors
        this.data=null
        this.message=message
        this.sucess=false

        if(stack){
            this.stack=stack
        }else{
            Error.captureStackTrace(this,this.constructor)
        }

    }
}

export {ApiError}