import { Type } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsPhoneNumber, IsString, Length, Matches } from 'class-validator';
import { CreateUserDTO, UpdateUserDTO } from '../DTOs/UserDTO';
import { PhoneSignUpDTO, VerifyOTPDTO } from '../DTOs/AuthDTO';

export const createUserValidation = {
    firstName: {
        isString: true,
        isNotEmpty: true,
        length: { min: 2, max: 50 }
    },
    lastName: {
        isString: true,
        isNotEmpty: true,
        length: { min: 2, max: 50 }
    },
    email: {
        isEmail: true,
        isNotEmpty: true
    },
    password: {
        isString: true,
        isNotEmpty: true,
        length: { min: 8 },
        matches: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/
    }
};

export const phoneSignupValidation = {
    phone_number: {
        isPhoneNumber: true,
        isNotEmpty: true
    }
};

export const verifyOTPValidation = {
    phone_number: {
        isPhoneNumber: true,
        isNotEmpty: true
    },
    otp: {
        isString: true,
        isNotEmpty: true,
        length: { min: 6, max: 6 }
    }
};

export const updateUserValidation = {
    firstName: {
        isString: true,
        isOptional: true,
        length: { min: 2, max: 50 }
    },
    lastName: {
        isString: true,
        isOptional: true,
        length: { min: 2, max: 50 }
    },
    email: {
        isEmail: true,
        isOptional: true
    }
};

export const loginValidation = {
    phone_number: {
        isPhoneNumber: true,
        isNotEmpty: true
    },
    password: {
        isString: true,
        isNotEmpty: true
    }
};
