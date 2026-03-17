using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace API.DTO
{
    public class LoginDTO
    {
        [Required]
        public string  Email { get; set; } = null!;

        [Required]
        
        public string Password { get; set; } = null!;
    }
}
