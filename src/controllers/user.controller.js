import {asyncHandler} from '../utils/asyncHandler.js'
import {APiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { APiResponse } from '../utils/ApiResponse.js'
import jwt from "jsonwebtoken"


const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}

    } catch (error) {
        throw new APiError(500, "Something went wrong while generating access and refresh token")
    }
}

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
    
    const existedUser = await User.findOne({
        $or: [{ email },{ username }]
    })

    if (existedUser) {
        throw new APiError(409, "User with username or email already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    console.log(req.files)
    //const coverImageLocalPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

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

const loginUser = asyncHandler(async (req, res) => {
    // req.body -> data
    // validation - emptyness(username or email)
    // find the user
    // password check
    // access and refresh token
    // send cookie

    const {username, email, password}  = req.body;

    if (!(username || email)) {
        throw new APiError(400, "username or email is required")
    }

    const user = await User.findOne({
        $or: [{username},{email}]
    })

    if (!user) {
        throw new APiError(404, "User doesn't exists")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

     if (!isPasswordValid) {
        throw new APiError(401, "Invalid user credentials")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).
    select("-password -refreshToken")
    console.log(loggedInUser);
    

    const options= {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new APiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In successfully"
        )
    )
})

const logoutUser = asyncHandler(async ( req,res ) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(200,{}, "User logged out successfully")
})

const refreshAccessToken =  (async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new APiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new APiError(401, "Invalid refresh token")
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new APiError(401, "Refresh token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookies("accessToken", accessToken, options)
        .cookies("refreshToken", refreshToken, options)
        .json(
            new APiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed successfully"
            )
        )
    } catch (error) {
        throw new APiError(401, error?.message || "Invalid refresh token")
    }
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken
}