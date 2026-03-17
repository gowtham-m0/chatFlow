using API.Common;
using API.Models;
using API.Services;
using API.DTO;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Antiforgery;
using API.Extensions;
using Microsoft.EntityFrameworkCore;


namespace API.Endpoints
{
    public static class AccountEndpoint
    {
        public static RouteGroupBuilder MapAccountEndpoint(this WebApplication app)
        {
            var group = app.MapGroup("/api/account").WithTags("account");

            group.MapPost("/register", async (HttpContext context, UserManager <AppUser> userManager,
                [FromForm] RegisterDTO registerDTO, IFormFile? profileImage) =>
            {


                var userFromDb = await userManager.FindByEmailAsync(registerDTO.email);

                if (userFromDb is not null)
                {
                    return Results.BadRequest(Response<string>.Failure("User already exists"));
                }

                if (profileImage is null)
                {
                    return Results.BadRequest(Response<string>.Failure("Profile image is required"));
                }

                var picture = await FileUpload.Upload(profileImage);
                picture = $"{context.Request.Scheme}://{context.Request.Host}/uploads/{picture}";

                var user = new AppUser
                {
                    Email = registerDTO.email,
                    FullName = registerDTO.fullName,
                    UserName = registerDTO.userName,
                    ProfileImage = picture
                };

                var result = await userManager.CreateAsync(user, registerDTO.password);

                if (!result.Succeeded)
                {
                    return Results.BadRequest(Response<string>.Failure(result.Errors.Select(x => x.Description).FirstOrDefault()!));
                }

                return Results.Ok(Response<string>.Success("", "User created successfully"));

            }).DisableAntiforgery();

            group.MapPost("/login", async (UserManager<AppUser> userManager,
                TokenService tokenService, LoginDTO loginDTO) =>
            {
             
                if(loginDTO is null)
                {
                    return Results.BadRequest(Response<string>.Failure("Invalid login details"));
                }

                var userFromDb = await userManager.FindByEmailAsync(loginDTO.Email);

                if(userFromDb is null)
                {
                    return Results.BadRequest(Response<string>.Failure("User does not exist"));
                }

                var result = await userManager.CheckPasswordAsync(userFromDb!, loginDTO.Password);

                if (!result)
                {
                    return Results.BadRequest(Response<string>.Failure("Invalid login details"));
                }

                var token = tokenService.GenerateToken(userFromDb.Id,userFromDb.UserName!);

                return Results.Ok(Response<string>.Success(token, "Login successfull"));


            }).DisableAntiforgery();

            group.MapGet("/me", async (HttpContext context, UserManager<AppUser> userManager) =>
            {
                var currentLoggedInUserId = context.User.GetUserId()!;

                var currentLoginUser = await userManager.Users.SingleOrDefaultAsync(x => x.Id == currentLoggedInUserId.ToString());

                return Results.Ok(Response<AppUser>.Success(currentLoginUser!, "User fetched successfully"));

            }).RequireAuthorization();
            
            return group;
        }
    }
}
