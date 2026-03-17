using System.ComponentModel.DataAnnotations;

namespace API.DTO
{
    public class RegisterDTO
    {
        [Required]
        public string fullName { get; set; } = null!;
        [Required]
        public string email { get; set; } = null!;
        [Required]
        public string password { get; set; } = null!;
        [Required]
        public string userName { get; set; } = null!;
    }
}
