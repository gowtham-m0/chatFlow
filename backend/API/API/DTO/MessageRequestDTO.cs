namespace API.DTO
{
    public class MessageRequestDTO
    {
        public int Id { get; set; }

        public string? SenderId { get; set; }

        public string? ReceiverId { get; set; }

        public string? Content { get; set; }

        public bool IsRead { get; set; }

        public DateTime CreatedDate { get; set; }
    }
}
