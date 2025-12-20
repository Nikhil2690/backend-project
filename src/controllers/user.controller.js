import {asyncHandler} from '../utils/asyncHandler.js'
import {APiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { APiResponse } from '../utils/ApiResponse.js'

const registerUser = asyncHandler(async (req, res) => {
    // get user details from frontend
    // validate the data for emptyness
    // check if user already exists
    // check for images, check for avatars
    // upload them to cloudinary (avatar)
    // create user object - crete entry in DB
    // remove password and refreshToken from response
    // check for user creation
    // return response

    const { fullName, username, email, password,  } = req.body
    console.log("email: ", email);

    if (
        [fullName, email, password, username].some((field)=>
        field?.trim()==="")
    ) {
        throw new ApiError(400, "All the fields are required")
    }
    
    const existedUser = User.findOne({
        $or: [{ email },{ username }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with username or email already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if (!avatarLocalPath) {
        throw new APiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new APiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        username,
        email,
        password,
    })

    const createdUser = await User.findById(user._id).select([
        "-password -refreshToken"
    ])

    if (!createdUser) {
        throw new APiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new APiResponse(200, createdUser, "User registed Successfully")
    );

})


export {
    registerUser
}