# Security Policy

## Supported Versions

Currently in active development. No LTS versions available yet.

| Version | Supported          |
| ------- | ------------------ |
| 0.x.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please **DO NOT** open a public issue.

Instead, send an email to: [tk@beigang.xyz]

Please include:

- **Description**: Clear description of the vulnerability
- **Steps to reproduce**: How to trigger the vulnerability
- **Impact**: Potential impact of the vulnerability
- **Proof of concept**: If possible, include a PoC

We will:

1. Acknowledge receipt within 48 hours
2. Provide a detailed response within 7 days
3. Confirm the fix and timeline
4. Notify you when the fix is deployed

## Security Best Practices

### For Users

- **Change default passwords**: Never use default passwords in production
- **Keep software updated**: Regularly update dependencies
- **Use HTTPS**: Always use HTTPS in production
- **Secure SSH**: Use SSH keys instead of passwords
- **Firewall**: Configure proper firewall rules
- **Regular backups**: Backup your database and configurations

### For Developers

- **Credential management**: Never hardcode credentials
- **Environment variables**: Use `.env` files (never commit them)
- **Input validation**: Validate and sanitize all inputs
- **SQL injection**: Use parameterized queries (ORM handles this)
- **XSS prevention**: Properly escape user-generated content
- **Dependencies**: Regularly run `npm audit` and update dependencies

### Deployment Security

- **VPS security**:
  - Use strong SSH keys
  - Disable root login
  - Configure firewall (ufw/iptables)
  - Keep system updated

- **Application security**:
  - Use strong CORS policies
  - Implement rate limiting
  - Enable helmet.js headers
  - Use secure session management

## Current Security Considerations

### Known Areas of Attention

1. **SSH Credential Storage**
   - Credentials are encrypted in the database
   - Consider implementing a secrets management system (e.g., HashiCorp Vault)

2. **WebSocket Communication**
   - Ensure proper authentication on WebSocket connections
   - Implement rate limiting on WebSocket endpoints

3. **V2Ray/Xray Configuration**
   - Generated configurations use UUID for authentication
   - Ensure UUID is properly randomized and secure

4. **Database Access**
   - Use least privilege principle for database user
   - Enable database connection encryption

## Dependency Security

We regularly audit dependencies. To check for vulnerabilities:

```bash
npm audit
npm audit fix
```

### Security-Related Dependencies

- `helmet`: Express security headers
- `cors`: Cross-origin resource sharing
- `class-validator`: Input validation
- `class-transformer`: Data transformation
- `bcrypt`: Password hashing (for future user authentication)

## Security Checklist

Before deploying to production:

- [ ] Change all default passwords
- [ ] Set strong `NODE_ENV=production`
- [ ] Configure proper CORS origin
- [ ] Enable HTTPS
- [ ] Set up firewall rules
- [ ] Disable debug logging
- [ ] Review `.env` configuration
- [ ] Backup database and configurations
- [ ] Test authentication flows
- [ ] Review user permissions

## Disclosure Policy

We follow responsible disclosure practices:

- Confirm vulnerabilities internally
- Develop and test fixes
- Release security updates
- Publish security advisories (with credits)
- Coordinate disclosure timeline

## Contact

For security-related questions that aren't vulnerabilities:
- Open an issue with the `security` label
- Email: tk@beigang.xyz
